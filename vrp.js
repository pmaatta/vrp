class Node {

    constructor(x, y, index, size=14, color="blue", timeWindow=[0, 200]) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.size = size;
        this.color = color;
        this.timeWindow = timeWindow;
        this.drawTimes = true;
        this.visited = false;
        this.type = "node_base";
    }

    draw(ctx, color=this.color, arrivalTime=-1, name=this.index, opaque=true) {

        let nodeColor = color;
        let textColor = "black"
        if (this.visited) {
            nodeColor = "rgb(190,190,190)";
            textColor = nodeColor;
        }

        // Draw shape
        if (this.type === "task") {
            if (opaque) { drawNodeTriangle(ctx, this.x, this.y, this.size, "white", true); }
            drawNodeTriangle(ctx, this.x, this.y, this.size, nodeColor);
        } else {
            if (opaque) { drawCircle(ctx, this.x, this.y, this.size, "white", true); }
            drawCircle(ctx, this.x, this.y, this.size, nodeColor);
        }

        // Draw index
        drawText(ctx, name, this.x, this.y, "bold 12px sans-serif", textColor);

        // Draw time window
        if (this.type !== "car" && this.drawTimes) {
            let timeWindowStr = "[" + this.timeWindow.toString() + "]";
            if (arrivalTime !== -1) {
                timeWindowStr += " (" + arrivalTime + ")";
            }
            const xShift = 2 * timeWindowStr.length - 3;
            drawText(ctx, timeWindowStr, this.x - xShift, this.y - 22, "10px sans-serif", textColor);
        }

        // Draw task duration
        if (this.type === "task") {
            drawText(ctx, this.duration, this.x - 2, this.y + 15, "10px sans-serif", textColor);
        }
    }

    drawLineTo(otherNode, ctx, lineColor="red", lineWidth=1.5) {

        // Draw line
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = lineColor;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(otherNode.x, otherNode.y);
        ctx.stroke();

        // Draw arrow
        const meanX = (this.x + otherNode.x) / 2;
        const meanY = (this.y + otherNode.y) / 2;
        const deltaX = otherNode.x - this.x;
        const deltaY = otherNode.y - this.y;
        const angle = Math.atan2(deltaY, deltaX);
        let shift = 10;
        let shiftX;
        let shiftY;
        if (angle > Math.PI/2 || angle <= -Math.PI/2) {
            shift *= -1;
        }
        if (deltaX !== 0) {
            shiftX = shift * (1 + (deltaY/deltaX)**2) ** (-0.5);
            shiftY = shiftX * (deltaY/deltaX);
        } else {
            shiftX = 0;
            shiftY = shift;
        }
        drawTriangle(ctx, meanX + shiftX, meanY + shiftY, angle, lineColor);
    }

}

class PickupNode extends Node {
    constructor(x, y, index, timeWindow=[50,250], size=14, color="blue") {
        super(x, y, index, size, color, timeWindow);
        this.type = "pickup";
    }
}

class DeliveryNode extends Node {
    constructor(x, y, index, timeWindow=[50,250], size=14, color="blue") {
        super(x, y, index, size, color, timeWindow);
        this.type = "delivery";
    }
}

class Task extends Node {
    constructor(x, y, index, duration=50, timeWindow=[50,250], size=18, color="blue") {
        super(x, y, index, size, color, timeWindow);
        this.type = "task";
        this.duration = duration;
    }
}

class Car extends Node {
    constructor(x, y, index, capacity=50, size=14, color="black") {
        super(x, y, index, size, color);
        this.type = "car";
        this.capacity = capacity;
        this.timeWindow = [0, 1000000];
    }
}

class Depot extends Node {
    constructor(x, y, index, size=28, color="black") {
        super(x, y, index, size, color);
        this.type = "depot";
        this.timeWindow = [0, 1000000];
    }
    draw(ctx, color=this.color, text=this.index, opaque=true) {
        if (opaque) {
            drawSquare(ctx, this.x, this.y, this.size, "white", true);
        }
        drawSquare(ctx, this.x, this.y, this.size, color);
        drawText(ctx, text, this.x, this.y);
    }
}

class PickupDeliveryPair {
    constructor(pickupNode, deliveryNode) {
        this.pickupNode = pickupNode;
        this.deliveryNode = deliveryNode;
    }
    draw(ctx) {
        this.pickupNode.drawLineTo(this.deliveryNode, ctx);
        this.pickupNode.draw(ctx);
        this.deliveryNode.draw(ctx);
    }
}

function drawGrid(ctx, canvas, spacing=60, color="rgb(220, 220, 220)", lineWidth=1.5) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    for (let w = 0; w < canvas.width; w += spacing) {
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(w, canvas.height);
        ctx.stroke();
    }
    
    for (let h = 0; h < canvas.height; h += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(canvas.width, h);
        ctx.stroke();
    }
}

function drawCircle(ctx, x, y, radius, color="black", fill=false, lineWidth=2) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2*Math.PI);
    if (fill) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

function drawSquare(ctx, x, y, width, color="black", fill=false, lineWidth=2) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    const topLeftX = x - width/2;
    const topLeftY = y - width/2;
    if (fill) {
        ctx.fillRect(topLeftX, topLeftY, width, width);
    } else {
        ctx.strokeRect(topLeftX, topLeftY, width, width);
    }
}

function drawTriangle(ctx, x, y, angle, color="red", size=14, widthAngle=Math.PI/2.5) {

    const angleA = angle + widthAngle + Math.PI/2;
    const AdeltaX = size * Math.cos(angleA);
    const AdeltaY = size * Math.sin(angleA);
    const Ax = x + AdeltaX;
    const Ay = y + AdeltaY;

    const angleB = angleA + 2 * (Math.PI/2 - widthAngle);
    const BdeltaX = size * Math.cos(angleB);
    const BdeltaY = size * Math.sin(angleB);
    const Bx = x + BdeltaX;
    const By = y + BdeltaY;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(Ax, Ay);
    ctx.lineTo(Bx, By);
    ctx.fill();
}

function drawNodeTriangle(ctx, x, y, size, color="black", fill=false, lineWidth=2) {

    const [Ax, Ay] = [x, y - size];
    const [Bx, By] = [x - (Math.sqrt(3)/2)*size, y + size/2];
    const [Cx, Cy] = [x + (Math.sqrt(3)/2)*size, y + size/2];

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(Ax, Ay);
    ctx.lineTo(Bx, By);
    ctx.lineTo(Cx, Cy);
    ctx.lineTo(Ax, Ay);

    if (fill) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

function drawText(ctx, text, x, y, font="bold 12px sans-serif", color="black") {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x-4, y+4);
}

function clearCanvas(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas);
}

function drawProblem(ctx, canvas, nodes, pickupDeliveryPairs) {
    clearCanvas(ctx, canvas);
    nodes.forEach(node => node.draw(ctx));
    pickupDeliveryPairs.forEach(pair => pair.draw(ctx));
}

function getRandomBrightColor(){ 
    return "hsl(" + 360*Math.random() + ", 100%," + (30 + 20*Math.random()) + "%)";
}
function getBrightColor(hue, randomLightness=false) {
    if (0 <= hue && hue <= 360) {
        if (randomLightness) {
            return "hsl(" + hue + ", 100%," + (30 + 20*Math.random()) + "%)";
        } else {
            return "hsl(" + hue + ", 100%, 40%)";
        }
    } else {
        return getRandomBrightColor();
    }
}
function getBrightColors(numColors) {
    const colors = [];
    for (let i = 1; i <= numColors; i++) {
        const hue = i * (360/(numColors+1));
        colors.push(getBrightColor(hue));
    }
    return colors;
}

function drawRoutes(ctx, canvas, nodes, solution) {
    
    clearCanvas(ctx, canvas);
    const routes = solution.routes;
    const routeTimes = solution.route_times_in;
    const colors = getBrightColors(routes.length);

    // Draw each route with a different color,
    // draw time windows and arrival times
    for (let j = 0; j < routes.length; j++) {
        const route = routes[j];
        const times = routeTimes[j];
        const routeColor = colors[j];
        
        for (let i = 0; i < route.length - 1; i++) {
            const prevNode = nodes[route[i]];
            const nextNode = nodes[route[i+1]];
            prevNode.drawLineTo(nextNode, ctx, routeColor, routeColor, 2);
            prevNode.draw(ctx, routeColor, times[i]);
            nextNode.draw(ctx, routeColor, times[i+1]);
        }
    }

    // Redraw cars and depot with original colors
    routes.forEach(route => {
        const carNode = nodes[route[0]];
        carNode.draw(ctx);
    });
    const depotIndex = nodes.findIndex(node => node.type === "depot");
    if (depotIndex >= 0)  {
        nodes[depotIndex].draw(ctx);
    }
}

function addNodeAndDraw(ctx, x, y, nodes, pickupDeliveryPairs, params) {

    const nodeAddingMode = params.nodeAddingMode;
    const useTimes = params.useTimes;
    const nodeIndex = nodes.length;
    let node;
    let pair;
    let depotExists = (nodes.findIndex(node => node.type === "depot")) !== -1;
    
    if (nodeIndex === 0) 
    {
        if (nodeAddingMode === "pickup-delivery") {
            node = new PickupNode(x, y, nodeIndex);
        }
        else if (nodeAddingMode === "car") {
            node = new Car(x, y, nodeIndex);
        }
        else if (nodeAddingMode === "depot") {
            node = new Depot(x, y, nodeIndex);
        }
        else if (nodeAddingMode === "task") {
            node = new Task(x, y, nodeIndex);
        }
    }
    else 
    {
        const prevNode = nodes[nodeIndex-1];
        
        if (nodeAddingMode === "pickup-delivery") {
            if (prevNode.type === "pickup") {
                node = new DeliveryNode(x, y, nodeIndex);
                node.drawTimes = useTimes;
                pair = new PickupDeliveryPair(prevNode, node);
                pickupDeliveryPairs.push(pair);
                pair.draw(ctx);
            } 
            else {
                node = new PickupNode(x, y, nodeIndex);
            }
        }
        else if (nodeAddingMode !== "pickup-delivery" && prevNode.type === "pickup") {
            alert("Add delivery node first!");
            return;
        }
        else if (nodeAddingMode === "car") {
            node = new Car(x, y, nodeIndex);
        }
        else if (nodeAddingMode === "depot") {
            if (depotExists) {
                alert("Only one depot allowed!");
                return;
            }
            node = new Depot(x, y, nodeIndex);
        }
        else if (nodeAddingMode === "task") {
            node = new Task(x, y, nodeIndex);
        }
    }

    node.drawTimes = useTimes;
    nodes.push(node);
    node.draw(ctx);
}

function randomX(canvas) {
    return Math.floor(Math.random() * canvas.width);
}
function randomY(canvas) {
    return Math.floor(Math.random() * canvas.height);
}

function generateRandomProblem(canvas, numCars, numPairs, nodes, pickupDeliveryPairs) {

    const depot = new Depot(randomX(canvas), randomY(canvas), 0);
    nodes.push(depot);

    for (let index = 1; index < numCars + 1; index++) {
        const car = new Car(randomX(canvas), randomY(canvas), index);
        nodes.push(car);
    }
    for (let index = numCars + 1; index < numCars + 1 + 2*numPairs; index++) {
        const pickup = new PickupNode(randomX(canvas), randomY(canvas), index);
        nodes.push(pickup);
        index++;
        const delivery = new DeliveryNode(randomX(canvas), randomY(canvas), index);
        nodes.push(delivery);
        const pair = new PickupDeliveryPair(pickup, delivery);
        pickupDeliveryPairs.push(pair);
    }
}

function packData(nodes, pickupDeliveryPairs, parameters) {
    
    const visitNodeIndices = [];          // Indices of all nodes that have to be visited by cars (tasks, pickups or deliveries)
    const pickupDeliveryIndicesFlat = []; // Indices of pickup and delivery nodes as a flat array
    const taskIndices = [];               // Indices of task nodes
    const carIndices = [];                // Indices of car nodes
    let depotIndex = -1;                  // Depot node index
    
    nodes.forEach(node => {
        if (node.type === "depot") {
            depotIndex = node.index;
        } else if (node.type === "car") {
            carIndices.push(node.index);
        } else if (node.type === "task") {
            taskIndices.push(node.index);
            visitNodeIndices.push(node.index);
        } else {
            pickupDeliveryIndicesFlat.push(node.index);
            visitNodeIndices.push(node.index);
        }
    });
    
    const pickupDeliveryPairIndices = pickupDeliveryPairs.map(pair => {
        return [pair.pickupNode.index, pair.deliveryNode.index]
    });

    const demands = nodes.map(node => {
        if (node.type === "pickup") {
            return parameters.defaultDemand;
        } 
        else if (node.type === "delivery") {
            return -parameters.defaultDemand;
        } 
        else {
            return 0;
        }
    });

    const serviceTimes = nodes.map(node => {
        if (node.type === "depot" || node.type === "car") {
            return [node.index, 0];
        } 
        else if (node.type === "pickup" || node.type === "delivery") {
            return [node.index, parameters.defaultServiceTime];
        } 
        else if (node.type === "task") {
            return [node.index, node.duration];
        }
    });

    const timeWindows = nodes.map(node => node.timeWindow);
    
    let data = {
        nodes,
        visitNodeIndices,
        carIndices,
        taskIndices,
        depotIndex,
        pickupDeliveryPairIndices,
        pickupDeliveryIndicesFlat,
        timeWindows,
        demands,
        serviceTimes
    };
    
    // Copy parameters into data object
    Object.assign(data, parameters);
    
    return data;
}

function validateData(data, alertIfValid=false) {

    const properties = [
        "nodes",
        "visitNodeIndices",
        "carIndices",
        "taskIndices",
        "depotIndex",
        "pickupDeliveryPairIndices",
        "pickupDeliveryIndicesFlat",
        "scalingFactor",
        "timeLimit",
        "objective",
        "timeWindows",
        "useTimes",
        "returnToDepot",
        "maxRouteLength",
        "previousSolution",
        "currentTime",
        "visitedNodesCars",
        "lockedNodesCars",
        "demands",
        "defaultDemand",
        "defaultCapacity",
        "defaultServiceTime",
        "serviceTimes"
    ];

    // TODO validate
    // "visitedNodesCars",
    // "lockedNodesCars",
    // "demands",
    // "defaultDemand",
    // "defaultCapacity",
    // "defaultServiceTime",
    // "serviceTimes"

    let hasRightProperties = true;
    properties.forEach(p => {
        if (!data.hasOwnProperty(p)) {
            hasRightProperties = false;
        }
    });
    for (const [key, value] of Object.entries(data)) {
        if (!properties.includes(key)) {
            hasRightProperties = false;
        }
    }
    
    let timeWindowsValid = true;
    data.timeWindows.forEach(window => {
        const [start, end] = window;
        if (isNaN(start) || isNaN(end) || end <= start || start < 0) {
            timeWindowsValid = false;
        }
    });
    data.pickupDeliveryPairIndices.forEach(pair => {
        const [fromIndex, toIndex] = pair;
        const [fromStart, fromEnd] = data.timeWindows[fromIndex];
        const [toStart, toEnd] = data.timeWindows[toIndex];
        if (toEnd < fromStart) {
            timeWindowsValid = false;
        }
    });

    const previousSolutionExists = (
        Object.keys(data.previousSolution).length > 0 && 
        data.previousSolution.status.includes("SUCCESS")
    );
    if (!previousSolutionExists) {
        data.previousSolution = {};
    }

    if (!hasRightProperties) {
        alert("Data has not been created properly!");
        return false;
    }
    if (!timeWindowsValid) {
        alert("Time windows are not valid!");
        return false;
    }
    if (data.visitNodeIndices.length !== data.pickupDeliveryIndicesFlat.length + data.taskIndices.length) {
        alert("Mismatch in visit node indices!");
        return false;
    }
    if (data.carIndices.length === 0) {
        alert("Data does not contain cars!");
        return false;
    }
    if (!(data.depotIndex >= 0)) {
        alert("Data does not contain depot!");
        return false;
    }
    if (data.visitNodeIndices.length === 0) {
        alert("Data does not contain any pickups or deliveries!");
        return false;
    }
    if (data.pickupDeliveryIndicesFlat.length % 2 !== 0) {
        alert("Missing delivery from corresponding pickup!");
        return false;
    }
    if (isNaN(data.scalingFactor)) {
        alert("Distance division factor is required!");
        return false;
    }
    if (isNaN(data.timeLimit)) {
        alert("Time limit is required!");
        return false;
    }
    if (!(["minSum", "minLongest"].includes(data.objective))) {
        alert("Objective is invalid!");
        return false;
    }
    if (isNaN(data.currentTime) || data.currentTime < 0 || !Number.isInteger(data.currentTime)) {
        alert("Current time is not valid!");
        return false;
    }
    if (alertIfValid) {
        alert("Data is valid!");
    }
    return true;
}

function getCSRF() {
    return document.getElementById("csrftoken").value;
}

function showText(div, text) {
    div.innerHTML = "";
    const newPara = document.createElement("p");
    newPara.textContent = text;
    div.appendChild(newPara);
}

function onDocumentReady(callback) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(callback, 1);
    } else {
        document.addEventListener("DOMContentLoaded", callback);
    }
}  


// ========================== Main ========================== //

onDocumentReady(() => {

    // HTML elements
    const canvas = document.getElementById("mycanvas");
    const ctx = canvas.getContext("2d");

    const modeSelect = document.getElementById("mode");
    const objectiveSelect = document.getElementById("objective");
    const timeWindowsCheckbox = document.getElementById("timewindows");
    const depotCheckbox = document.getElementById("depot");
    const editCheckbox = document.getElementById("edit");

    const solveButton = document.getElementById("solve");
    const displayRoutesButton = document.getElementById("routes");
    const displayProblemButton = document.getElementById("problem");
    const generateButton = document.getElementById("random");
    const clearButton = document.getElementById("clear");
    const advanceTimeButton = document.getElementById("advance");
    const resetTimeButton = document.getElementById("reset");
    const timeDisplay = document.getElementById("time_display");
    const pauseButton = document.getElementById("pause");

    const numCarsInput = document.getElementById("num_cars");
    const numPairsInput = document.getElementById("num_pairs");
    const scalingInput = document.getElementById("scaling");
    const timeLimitInput = document.getElementById("timelimit");
    const maxLengthInput = document.getElementById("maxlength");

    const solutionDiv = document.querySelector(".solution_div");
    const infoButton = document.querySelector("button.info");
    const infoDiv = document.querySelector(".instructions");

    // Initial setup
    displayRoutesButton.disabled = true;
    displayProblemButton.disabled = true;
    advanceTimeButton.disabled = true;
    resetTimeButton.disabled = true;
    pauseButton.disabled = true;
    depotCheckbox.checked = false;
    editCheckbox.checked = false;
    drawGrid(ctx, canvas);

    // Global variables & parameters
    let nodes = [];
    let pickupDeliveryPairs = [];
    let solution = {};
    let currentTime = 0;
    let initialCarLocations = {};
    let visitedNodesCars = [];
    let lockedNodesCars = [];

    const defaultDemand = 5;
    const defaultCapacity = 50;
    const defaultServiceTime = 5;

    let useTimes = timeWindowsCheckbox.checked;
    let returnToDepot = depotCheckbox.checked;
    let editMode = editCheckbox.checked;
    let paused = true;


    // ---- Controls ---- //

    function clear() {
        clearCanvas(ctx, canvas);
        currentTime = 0;
        nodes = [];
        pickupDeliveryPairs = [];
        initialCarLocations = {};
        visitedNodesCars = [];
        lockedNodesCars = [];
        paused = true;
        displayRoutesButton.disabled = true;
        displayProblemButton.disabled = true;
        advanceTimeButton.disabled = true;
        resetTimeButton.disabled = true;
        pauseButton.disabled = true;
        solutionDiv.innerHTML = "";
        displayCurrentTime();
    }

    infoButton.addEventListener("click", function() {
        infoDiv.hidden = !infoDiv.hidden;
    });

    function displayCurrentTime() {
        timeDisplay.textContent = "Current time: " + Math.floor(currentTime);
    }

    canvas.addEventListener("mousedown", function(event) {
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (editMode) {
            
            // Edit properties of closest node to click (enter time window)
            
            // Get closest node to click
            let minDist = 1000000;
            let closestNodeIndex = -1;
            for (let i = 0; i < nodes.length; i++) {
                const dist = Math.sqrt((nodes[i].x - x)**2 + (nodes[i].y - y)**2);
                if (dist < minDist) { 
                    closestNodeIndex = i;
                    minDist = dist;
                }
            }
            if (closestNodeIndex === -1 || minDist > 20) return;
            if (nodes[closestNodeIndex].type === "car" || nodes[closestNodeIndex].type === "depot") {
                alert("Cannot edit car or depot node time window!");
                return;
            }
            
            // Get time window by prompting
            let start, end;
            const str = prompt("Enter node time window as two integers separated by a space:");
            if (!str) return;
            try {
                [start, end] = str.split(" ").map(num => parseInt(num, 10));
            } 
            catch(error) {
                alert("Time window entered is invalid!");
                return;
            }
            if (isNaN(start) || isNaN(end) || end <= start || start < 0) {
                alert("Time window entered is invalid!");
                return;
            }

            // Edit window and redraw
            nodes[closestNodeIndex].timeWindow = [start, end];
            drawProblem(ctx, canvas, nodes, pickupDeliveryPairs);
        }
        else {

            // Add new node
            const params = {
                nodeAddingMode: modeSelect.value,
                useTimes
            }    
            addNodeAndDraw(ctx, x, y, nodes, pickupDeliveryPairs, params);
        }
    });

    solveButton.addEventListener("click", function() {

        // Send data to backend for computations

        const parameters = {
            scalingFactor: parseInt(scalingInput.value, 10),
            timeLimit: parseInt(timeLimitInput.value, 10),
            objective: objectiveSelect.value,
            useTimes,
            returnToDepot,
            maxRouteLength: parseInt(maxLengthInput.value, 10),
            previousSolution: solution,
            currentTime: Math.floor(currentTime),
            visitedNodesCars,
            lockedNodesCars,
            defaultDemand,
            defaultCapacity,
            defaultServiceTime
        };

        const data = packData(nodes, pickupDeliveryPairs, parameters);
        const dataIsValid = validateData(data);

        if (dataIsValid) {
            
            const xhr = new XMLHttpRequest();
            const url = "";
            xhr.open("POST", url, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("X-CSRFToken", getCSRF());

            xhr.onerror = function() {
                alert("XHR error");
            };
            
            xhr.onloadstart = function() {
                showText(solutionDiv, "Solving...");
            };
            
            xhr.onload = function() {

                // Get data from response
                let responseObj;
                try {
                    responseObj = JSON.parse(xhr.response);
                } catch (error) {
                    alert("Server error");
                    console.log(error);
                    return;
                }
                const lines = responseObj.solutionText;
                solution = responseObj.solution;

                // Enable route visualization if solution found 
                if (solution.hasOwnProperty("routes")) {
                    displayRoutesButton.disabled = false;
                    displayProblemButton.disabled = false;
                    advanceTimeButton.disabled = false;
                } else {
                    displayRoutesButton.disabled = true;
                    advanceTimeButton.disabled = true;
                }

                // Print solution information
                solutionDiv.innerHTML = "";
                lines.forEach(line => {
                    const newPara = document.createElement("p");
                    newPara.textContent = line;
                    solutionDiv.appendChild(newPara);
                });

            };
            
            xhr.send(JSON.stringify(data));
        }

    });

    displayRoutesButton.addEventListener("click", function() {
        drawRoutes(ctx, canvas, nodes, solution);
    });

    displayProblemButton.addEventListener("click", function() {
        drawProblem(ctx, canvas, nodes, pickupDeliveryPairs);
    });

    generateButton.addEventListener("click", function() {
        // Reset, generate & draw
        clear();
        const numCars = parseInt(numCarsInput.value, 10);
        const numPairs = parseInt(numPairsInput.value, 10);
        generateRandomProblem(canvas, numCars, numPairs, nodes, pickupDeliveryPairs);
        nodes.forEach(node => node.drawTimes = useTimes);
        drawProblem(ctx, canvas, nodes, pickupDeliveryPairs);
    });

    clearButton.addEventListener("click", function() {
        clear();
    });

    timeWindowsCheckbox.addEventListener("click", function() {
        useTimes = this.checked;
        nodes.forEach(node => node.drawTimes = useTimes);
        drawProblem(ctx, canvas, nodes, pickupDeliveryPairs);
    });

    depotCheckbox.addEventListener("click", function() {
        returnToDepot = this.checked;
    });

    editCheckbox.addEventListener("click", function() {
        editMode = this.checked;
    });

    advanceTimeButton.addEventListener("click", function() {
        advanceTimeButton.disabled = true;
        resetTimeButton.disabled = false;
        pauseButton.disabled = false;
        paused = false;
        advanceTime();
    });

    function advanceTime() {

        // Advance time and move each car along its route
        // TODO can be optimized

        // Store initial car locations
        if (currentTime === 0) {
            initialCarLocations = {};
            nodes.forEach(node => {
                if (node.type === "car") {
                    initialCarLocations[node.index] = [node.x, node.y];
                }
            });
        }

        const routes = solution.routes;
        const routeTimes = solution.route_times_in;
        const newRoutes = [];
        const newRouteTimes = [];
        lockedNodesCars = [];

        let longestRouteLength = 0;
        routeTimes.forEach(times => {
            const lastTime = times[times.length-1];
            if (lastTime > longestRouteLength) {
                longestRouteLength = lastTime;
            }
        });

        // Advance time
        const increment = 0.07;
        if (currentTime + increment > longestRouteLength) {
            currentTime = longestRouteLength;
        } else {
            currentTime += increment;
        }
        displayCurrentTime();

        // Move cars and visit nodes
        for (let i = 0; i < routes.length; i++) {

            const route = routes[i];
            const times = routeTimes[i];
            const carNode = nodes[route[0]];
            const newRoute = [route[0]];
            const newTimes = [times[0]];

            // Get index of the node which the car is currently heading to
            let nextNodeIndex = 0;
            while (times[nextNodeIndex] <= currentTime && nextNodeIndex < times.length - 1) {
                nextNodeIndex++;
            }

            // Mark visited nodes, make new route
            for (let j = 1; j < route.length; j++) {
                const node = nodes[route[j]];
                if (j < nextNodeIndex && node.type !== "car" && node.type !== "depot") {
                    if (node.visited === false) {
                        node.visited = true;
                        visitedNodesCars.push([node.index, carNode.index]);
                    }
                }
                else if (j >= nextNodeIndex && currentTime < times[times.length-1]) {
                    newRoute.push(route[j]);
                    newTimes.push(times[j]);
                }
            }
            newRoutes.push(newRoute);
            newRouteTimes.push(newTimes);

            // The route of the car is empty
            if (route.length < 2) {
                continue;
            }

            if (nextNodeIndex === 0 && route.length > 1) {
                alert("nextNodeIndex is 0 for route length > 1");
                console.log({currentTime, nextNodeIndex, route, times});
            }

            // Lock next destination
            lockedNodesCars.push([route[nextNodeIndex], carNode.index]);

            // Move car
            const prevNode = nodes[route[nextNodeIndex-1]];
            const nextNode = nodes[route[nextNodeIndex]];
            const nextTime = times[nextNodeIndex];
            const distance = Math.sqrt((prevNode.x - nextNode.x)**2 + (prevNode.y - nextNode.y)**2);
            const travelTime = distance / parseInt(scalingInput.value, 10);
            
            // Car waiting at previous node
            if (currentTime <= nextTime - travelTime) {
                carNode.x = prevNode.x;
                carNode.y = prevNode.y;
            }
            // Car on the way to next node
            else if (currentTime <= nextTime) {
                const proportionTraveled = (travelTime - (nextTime - currentTime)) / travelTime;  // travelTime === 0?
                const deltaX = nextNode.x - prevNode.x;
                const deltaY = nextNode.y - prevNode.y;
                carNode.x = prevNode.x + proportionTraveled * deltaX;
                carNode.y = prevNode.y + proportionTraveled * deltaY;
            }
            // Car at end of route
            else if (currentTime > times[times.length-1]) {
                carNode.x = nextNode.x;
                carNode.y = nextNode.y;
            }
        }

        const newRoutesAndTimes = {
            routes: newRoutes,
            route_times_in: newRouteTimes
        };
        drawRoutes(ctx, canvas, nodes, newRoutesAndTimes);

        if (!paused && currentTime < longestRouteLength) {
            setTimeout(advanceTime, 1);
        } 
        else if (currentTime >= longestRouteLength) {
            pauseButton.click();
            advanceTimeButton.disabled = true;
            resetTimeButton.disabled = false;
        }
    }

    resetTimeButton.addEventListener("click", function() {
        currentTime = 0;
        displayCurrentTime();
        advanceTimeButton.disabled = false;
        visitedNodesCars = [];
        lockedNodesCars = [];

        // Reset cars to the beginning of their routes
        nodes.forEach(node => node.visited = false);
        for (const [index, location] of Object.entries(initialCarLocations)) {
            nodes[index].x = location[0];
            nodes[index].y = location[1];
        }

        drawRoutes(ctx, canvas, nodes, solution);
    });

    pauseButton.addEventListener("click", function() {
        advanceTimeButton.disabled = false;
        pauseButton.disabled = true;
        paused = true;
    });

});
