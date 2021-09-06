import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


SOLVER_STATUSES = [
    'ROUTING_NOT_SOLVED: Problem not solved yet',
    'ROUTING_SUCCESS: Problem solved successfully',
    'ROUTING_FAIL: No solution found to the problem',
    'ROUTING_FAIL_TIMEOUT: Time limit reached before finding a solution',
    'ROUTING_INVALID: Model, model parameters, or flags are not valid',
]


def compute_travel_times(json_data, squared=False):
    """
    Compute travel times between each node in the problem including car nodes and the depot.
    """
    locations = [(node['x'], node['y']) for node in json_data['nodes']]
    scaling = json_data['scalingFactor']
    travel_times = []
    
    for x1, y1 in locations:
        row = []
        for x2, y2 in locations:
            d = (x2-x1)**2 + (y2-y1)**2
            if not squared:
                # With distance deprecated, scaling is done here but
                # not undone at the end
                d = int(round(math.sqrt(d) / scaling))
            row.append(d)
        travel_times.append(row)

    if not json_data['returnToDepot']:
        # Depot is a dummy location with distance 0 to other nodes
        # -> it does not affect the optimization
        # -> routes are not optimized for returning to the depot at the end
        depot_idx = json_data['depotIndex']
        for i in range(len(locations)):
            travel_times[i][depot_idx] = 0
            travel_times[depot_idx][i] = 0

    return travel_times


def get_initial_vehicle_loads(demands, vehicle_nodes, visited_nodes_cars, vehicle_node_to_idx):
    """
    Compute the amount of cargo each vehicle is carrying at the current time from the given data.
    """
    vehicle_idx_to_load = {
        vehicle_node_to_idx[node]: 0 for node in vehicle_nodes
    }
    for node, car in visited_nodes_cars:
        vehicle_idx = vehicle_node_to_idx[car]
        vehicle_idx_to_load[vehicle_idx] += demands[node]
    
    return vehicle_idx_to_load


def create_data_model(json_data):
    """
    Parse received JSON data into an easily usable dictionary for modeling the problem.
    """
    data = {}
    
    data['num_nodes'] = len(json_data['nodes'])
    data['travel_times'] = compute_travel_times(json_data)
    data['service_times'] = {pair[0]: pair[1] for pair in json_data['serviceTimes']}
    data['pickups_deliveries'] = json_data['pickupDeliveryPairIndices']
    data['tasks'] = json_data['taskIndices']
    data['num_vehicles'] = len(json_data['carIndices'])
    data['vehicle_nodes'] = json_data['carIndices']
    data['vehicle_end_nodes'] = [json_data['depotIndex']] * len(json_data['carIndices'])
    data['vehicle_node_to_idx'] = {node: index for index, node in enumerate(data['vehicle_nodes'])}
    data['visit_nodes'] = json_data['visitNodeIndices']
    data['depot'] = json_data['depotIndex']
    data['scaling'] = json_data['scalingFactor']
    data['timelimit'] = json_data['timeLimit']
    data['objective'] = json_data['objective']
    data['return_to_depot'] = json_data['returnToDepot']
    data['max_route_length'] = json_data['maxRouteLength']
    data['current_time'] = json_data['currentTime']
    data['visited_nodes_cars'] = json_data['visitedNodesCars']
    data['locked_nodes_cars'] = json_data['lockedNodesCars']
    data['demands'] = json_data['demands']
    data['capacities'] = [json_data['defaultCapacity']] * data['num_vehicles']
    data['vehicle_idx_to_load'] = get_initial_vehicle_loads(data['demands'], 
                                                            data['vehicle_nodes'], 
                                                            data['visited_nodes_cars'], 
                                                            data['vehicle_node_to_idx'])

    if json_data['useTimes']:
        data['time_windows'] = json_data['timeWindows']
    else:
        data['time_windows'] = [(0, 9223372036854775807)] * data['num_nodes']

    return data


def solution_to_dict(data, manager, routing, solution):
    """
    Convert the solution object given by OR-tools into a dictionary containing the relevant information.
    """
    routes = []
    route_loads = []
    route_times_in = []
    route_times_out = []
    route_costs = []
    total_cost = 0
    time_dimension = routing.GetDimensionOrDie('time_dimension')

    # Collect routes, route timings and route costs for each vehicle
    for vehicle_id in range(data['num_vehicles']):
        route = []
        times_in = []
        times_out = []
        loads = []
        cumul_load = data['vehicle_idx_to_load'][vehicle_id]
        index = routing.Start(vehicle_id)
        
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            route.append(node)
            time_in = solution.Value(time_dimension.CumulVar(index))
            time_out = time_in + data['service_times'][node]
            times_in.append(time_in)
            times_out.append(time_out)
            cumul_load += data['demands'][node]
            loads.append(cumul_load)
            index = solution.Value(routing.NextVar(index))
        
        if data['return_to_depot']:
            node = manager.IndexToNode(index)
            route.append(node)
            time_in = solution.Value(time_dimension.CumulVar(index))
            time_out = time_in + data['service_times'][node]
            times_in.append(time_in)
            times_out.append(time_out)
            cumul_load += data['demands'][node]
            loads.append(cumul_load)
        
        routes.append(route)
        route_loads.append(loads)
        route_times_in.append(times_in)
        route_times_out.append(times_out)
    
        route_cost = times_out[-1]
        route_costs.append(route_cost)
        total_cost += route_cost

    solution_dict = {
        'routes': routes,
        'route_loads': route_loads,
        'route_times_in': route_times_in,
        'route_times_out': route_times_out,
        'route_costs': route_costs,
        'total_cost': total_cost,
        'model_total_cost': solution.ObjectiveValue(),
        'status': SOLVER_STATUSES[routing.status()],
    }

    return solution_dict


def solution_dict_to_lines(solution_dict):
    """
    Convert the solution dictionary into a list of strings describing the solution.
    """
    solution_lines = []
    routes = solution_dict['routes']
    route_loads = solution_dict['route_loads']
    route_times_in = solution_dict['route_times_in']
    route_times_out = solution_dict['route_times_out']
    route_costs = solution_dict['route_costs']
    total_cost = solution_dict['total_cost']
    model_total_cost = solution_dict['model_total_cost']
    
    solution_lines.append(solution_dict['status'])
    solution_lines.append(f'Total length of all routes: {total_cost} s')
    solution_lines.append(f'Objective function value minimized by model: {model_total_cost}')

    for i, route in enumerate(routes):
        solution_lines.append('----------')
        nodes_times_loads = [
            f'{node} ({time_in}-{time_out}s, {load}kg)' 
            for node, time_in, time_out, load 
            in zip(route, route_times_in[i], route_times_out[i], route_loads[i])
        ]
        solution_lines.append(f'Route for vehicle {i+1}:   ' + ' -> '.join(nodes_times_loads))
        solution_lines.append(f'Length of the route: {route_costs[i]} s')

    solution_lines.append('----------')
    return solution_lines


def validate_solution(solution_dict, data):
    """
    Check the found solution for validity.
    """
    
    if "SUCCESS" not in solution_dict['status']:
        return True, ["No solution"]

    messages = ['WARNING: the solution is not valid due to the following:']

    routes = solution_dict['routes']
    route_loads = solution_dict['route_loads']
    route_times = solution_dict['route_times_in']
    route_costs = solution_dict['route_costs']
    num_cars = len(routes)

    if not len(route_loads) == num_cars:
        messages.append("Incorrect route_loads length")
        
    if not len(route_times) == num_cars:
        messages.append("Incorrect route_times length")
    
    if not len(route_costs) == num_cars:
        messages.append("Incorrect route_costs length")

    # Return early if above fails
    if len(messages) > 1:
        messages.append('----------')
        return False, messages


    ###  Node visit checks  ###
    
    extra_visit_nodes = []
    visited_nodes = [x[0] for x in data['visited_nodes_cars']]
    for route in routes:
        for node in route:
            if node not in data['vehicle_nodes'] and node != data['depot']:
                if node in visited_nodes:
                    if node not in extra_visit_nodes:
                        extra_visit_nodes.append(node)
                else:
                    visited_nodes.append(node)

    # All nodes are visited (except depot)
    unvisited_nodes = list(set(data['visit_nodes']).difference(set(visited_nodes)))
    if len(unvisited_nodes) > 0:
        messages.append(f"Not all nodes are visited (nodes {str(unvisited_nodes)})")

    # No nodes are visited more than once
    if len(extra_visit_nodes) > 0:
        messages.append(f"Some nodes are visited more than once (nodes {str(extra_visit_nodes)})")


    for vehicle_idx in range(num_cars):

        vehicle_node = data['vehicle_nodes'][vehicle_idx]
        
        route = routes[vehicle_idx]
        loads = route_loads[vehicle_idx]
        times = route_times[vehicle_idx]
        cost = route_costs[vehicle_idx]
        capacity = data['capacities'][vehicle_idx]


        ###  Capacity checks  ###

        # Route ends with no cargo
        if not loads[-1] == 0:
            messages.append(f"Car {vehicle_node} does not end with 0 cargo")

        # The amount of cargo is not negative at any point
        if not len([x for x in loads if x < 0]) == 0:
            messages.append(f"Car {vehicle_node} has negative cargo")

        # The amount of cargo does not exceed the capacity of the vehicle
        if not len([x for x in loads if x > capacity]) == 0:
            messages.append(f"Car {vehicle_node} exceeds its capacity")

        
        ###  Time window checks  ###

        # Maximum route length is not exceeded
        if times[-1] > data['max_route_length']:
            messages.append(f"Car {vehicle_node} exceeds its maximum route length")

        # Times are not negative
        if not len([t for t in times if t < 0]) == 0:
            messages.append(f"Car {vehicle_node} has negative route times")

        # Route times do not decrease at any point
        times_decreasing = False
        for i in range(len(times) - 1):
            if times[i+1] < times[i]:
                times_decreasing = True
                break
        if times_decreasing:
            messages.append(f"Car {vehicle_node} goes back in time")

        # Cars arrive at nodes within time windows
        for node, time in zip(route, times):
            window = data['time_windows'][node]
            start = window[0]
            end = window[1]
            if not start <= time <= end:
                messages.append(f"Node {node} is not visited within its time window (car {vehicle_node})")


        ###  Pickup-delivery checks  ### 

        # TODO



    # Failed
    if len(messages) > 1:
        messages.append('----------')
        return False, messages
    
    # Passed
    return True, messages


def solve(json_data=None):
    """
    Solve the vehicle routing problem from the given data and return the solution information.
    """

    ###  Instantiate the data for the problem  ###
    if json_data is None:
        return ['JSON data is None'], {}
    data = create_data_model(json_data)
    
    ###  Create routing index manager  ###
    manager = pywrapcp.RoutingIndexManager(
        data['num_nodes'],
        data['num_vehicles'], 
        data['vehicle_nodes'],
        data['vehicle_end_nodes']
    )

    ###  Create routing model  ###
    routing = pywrapcp.RoutingModel(manager)


    ###  Define time cost of each arc (service time + travel time)  ###
    def arc_cost_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        service_time = data['service_times'][from_node]
        travel_time = data['travel_times'][from_node][to_node]
        return service_time + travel_time

    transit_callback_index = routing.RegisterTransitCallback(arc_cost_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    ###  Add cumulative variables for time  ###
    dimension_name = 'time_dimension'
    routing.AddDimension(
        transit_callback_index,
        1000000,                     # allowed waiting time at each node (slack)
        data['max_route_length'],    # maximum time per route
        False,                       # whether cumulative value has to start from zero
        dimension_name
    )
    time_dimension = routing.GetDimensionOrDie(dimension_name)


    ###  Capacity constraints  ###
    # Amount of cargo to pick up or drop off at each node
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return data['demands'][from_node]
    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    
    # Add cumulative variables for capacity
    dimension_name = 'capacity_dimension'
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,       # capacity demand at each node (+ for pickup, - for delivery)
        0,                           # capacity has no slack
        data['capacities'],          # maximum capacity per vehicle
        False,                       # whether cumulative value has to start from zero
        dimension_name
    )
    capacity_dimension = routing.GetDimensionOrDie(dimension_name)


    ###  Set initial time, set initial load  ### 
    for i in range(data['num_vehicles']):
        start_index = routing.Start(i)
        time_dimension.CumulVar(start_index).SetValue(data['current_time'])
        capacity_dimension.CumulVar(start_index).SetValue(data['vehicle_idx_to_load'][i])


    ###  Add slack to cost  ###
    # TODO: is this correct / necessary?
    time_dimension.SetSpanCostCoefficientForAllVehicles(1)


    ###  Objective function:  ###
    # minimize length of longest route (minLongest) 
    # or the sum of all route lengths (minSum) (done by default)
    if data['objective'] == 'minLongest':
        time_dimension.SetGlobalSpanCostCoefficient(100)

    
    ###  Get visited nodes & prevent visits to them  ###
    visited_nodes_cars = data['visited_nodes_cars']
    visited_nodes_cars_idxs = [
        (manager.NodeToIndex(node), data['vehicle_node_to_idx'][car]) 
        for node, car in visited_nodes_cars
    ]
    visited_node_idx_to_car_idx = dict(visited_nodes_cars_idxs)
    visited_node_idxs = [node_idx for node_idx, car_idx in visited_nodes_cars_idxs]
    for node_idx in visited_node_idxs:
        routing.AddDisjunction([node_idx], 0)
        routing.VehicleVar(node_idx).SetValues([-1])


    ###  Set locked nodes (next destination of car)  ###
    locked_nodes_cars = data['locked_nodes_cars']
    locked_nodes_cars_idxs = [
        (manager.NodeToIndex(node), data['vehicle_node_to_idx'][car]) 
        for node, car in locked_nodes_cars
    ]
    for node_index, vehicle_index in locked_nodes_cars_idxs:
        routing.SetAllowedVehiclesForIndex([vehicle_index], node_index)
        index = routing.Start(vehicle_index)
        routing.NextVar(index).SetValues([node_index])


    ###  Define constraints for pickups and deliveries  ###
    for request in data['pickups_deliveries']:
        pickup_index = manager.NodeToIndex(request[0])
        delivery_index = manager.NodeToIndex(request[1])
        
        # Pickup and delivery node both not visited
        if pickup_index not in visited_node_idxs:
            routing.AddPickupAndDelivery(pickup_index, delivery_index)
            routing.solver().Add(
                routing.VehicleVar(pickup_index) == routing.VehicleVar(delivery_index)
            )
            routing.solver().Add(
                time_dimension.CumulVar(pickup_index) <=
                time_dimension.CumulVar(delivery_index)
            )

        # Pickup node visited but delivery node not yet
        # Only the vehicle that did the pickup is allowed to visit the delivery node
        elif delivery_index not in visited_node_idxs:
            vehicle_index = visited_node_idx_to_car_idx[pickup_index]
            routing.SetAllowedVehiclesForIndex([vehicle_index], delivery_index)


    ###  Add time window constraints for each location except depot and car nodes  ###
    for node, time_window in enumerate(data['time_windows']):
        if node == data['depot'] or node in data['vehicle_nodes']:
            continue
        index = manager.NodeToIndex(node)
        time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

    # Instantiate route start and end times to produce feasible times
    for i in range(data['num_vehicles']):
        routing.AddVariableMinimizedByFinalizer(
            time_dimension.CumulVar(routing.Start(i))
        )
        routing.AddVariableMinimizedByFinalizer(
            time_dimension.CumulVar(routing.End(i))
        )


    # Set first solution heuristic
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.AUTOMATIC
    )

    # Time limit
    search_parameters.time_limit.seconds = data['timelimit']

    # Solve 
    solution = routing.SolveWithParameters(search_parameters)
    status = SOLVER_STATUSES[routing.status()]

    # Return solution information
    if solution:
        solution_dict = solution_to_dict(data, manager, routing, solution)
        solution_lines = solution_dict_to_lines(solution_dict)
        solution_valid, messages = validate_solution(solution_dict, data)
        if not solution_valid:
            solution_lines = solution_lines[:4] + messages + solution_lines[4:]
        return solution_lines, solution_dict

    else:
        return [status], {}
