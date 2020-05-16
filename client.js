"use strict";

let
numPoints = 5,
points = [],
canvas, ctx,
shouldDrawLines = false,
nonConvexityAllowed = false;

window.onload = () => {
	canvas = document.createElement("canvas");
	ctx = canvas.getContext("2d");
	canvas.width  = document.body.clientWidth;
	canvas.height = document.body.clientHeight;
	document.body.appendChild(canvas);

	pointHandler(numPoints);

	const
	increasePoints = document.querySelector("#increase-points"),
	decreasePoints = document.querySelector("#decrease-points"),
	toggleLines = document.querySelector("#toggle-lines"),
	getAsImage = document.querySelector("#get-as-image"),
	allowNonConvexity = document.querySelector("#allow-non-convexity");

	increasePoints.onclick = e => {
		if (numPoints >= 13) return;
		points = [];
		const pointContainer = document.querySelector("#point-container");
		pointContainer.querySelectorAll("*").forEach(point => point.remove());

		pointHandler(numPoints += 2);
	}
	decreasePoints.onclick = e => {
		if (numPoints <= 3) return;
		points = [];
		const pointContainer = document.querySelector("#point-container");
		pointContainer.querySelectorAll("*").forEach(point => point.remove());

		pointHandler(numPoints -= 2);
	}

	toggleLines.onclick = e => {
		shouldDrawLines = shouldDrawLines ? false : true;
	}

	getAsImage.onclick = e => {
		const
		stylesheet = `<link rel="stylesheet" type="text/css" href="style.css">`,
		data = canvas.toDataURL("image/png"),
		html = `${stylesheet}<iframe src="${data}"></iframe>`;

	    window.open("", "_self").document.write(html);
	}

	allowNonConvexity.onclick = e => {
		nonConvexityAllowed = nonConvexityAllowed ? false : true;
	}

	requestAnimationFrame(draw);
}

function draw() {
	clearCanvas();

	const
	padding       = calcMinimumPadding(),
	radii         = calcRadii(padding),
	rectangle     = calcRectangle(radii),
	intersections = calcIntersections(radii),
	tangencies    = calcTangencies(radii);


	fillInShape(radii, rectangle, intersections, tangencies);

	if (shouldDrawLines) {
		drawCircles(radii);
		drawLines(rectangle, intersections);
	}

	window.requestAnimationFrame(draw);
}

// draw functions
function calcMinimumPadding() {
	let minimum = Infinity;

	for (let i = 0; i < points.length; i++) {
		const distance = (() => {
			let sum = 0,
				num = (points.length - 1) / 2;
			for (let j = 0; j < num; j++) {
				sum += dist(i + j, i + j + num);
			}
			return sum;
		})();

		if (distance < minimum) minimum = distance;
	}
	return minimum;
}
function calcRadii(padding) {
	let radii = {small: [], large: []};

	for (let i = 0; i < points.length; i++) {

		const
		p = points[i],
		small = (() => {
			let sum = -padding,
				num = (points.length - 1) / 2;
			for (let j = 0; j < num; j++) {
				sum += dist(i + 1 + j, i + 1 + j + num);
			}
			return Math.round(sum);
		})(),
		large = (() => {
			let sum = -padding,
				num = (points.length + 1)/2;
			for (let j = 0; j < num; j++) {
				sum += dist(i + j, i + j + num);
			}
			return Math.round(sum);
		})();

		radii.small.push(small > 0 ? small : 0);
		radii.large.push(large);
	}
	return radii;
}
function calcRectangle(radii) {
	const
	x = points.map(p => p.x),
	y = points.map(p => p.y),

	neg = array => array.map(item => -item),
	min = array => Math.floor(array.reduce((a, b) => Math.min(a, b))),
	max = array => Math.ceil (array.reduce((a, b) => Math.max(a, b))),

	addTermwise = (a, b) => a.map((num, index) => num + b[index]),

	r = {
		x: max(addTermwise(x, neg(radii.large))),
		y: max(addTermwise(y, neg(radii.large)))
	};

	r.width  = min(addTermwise(x, radii.large)) - r.x;
	r.height = min(addTermwise(y, radii.large)) - r.y;

	return r;
}
function calcIntersections(radii) {
	let intersections = [];
	for (let i = 0; i < points.length; i++) {
		const
		j = (i + 1) % points.length,

		x1 = points[i].x,    y1 = points[i].y,
		x2 = points[j].x,    y2 = points[j].y,
		r1 = radii.large[i], r2 = radii.large[j],

		// unreadable math, but it calculates where circles touch "efficiently"

		dx = x2 - x1, dy = y2 - y1,
		R   = dx ** 2 + dy ** 2,
		dr2 = r1 ** 2 - r2 ** 2,

		sqrt = Math.sqrt(4 * R * (r2 ** 2) - (dr2 - R) ** 2),

		x = Math.round((x1 + x2 + (dx * dr2 - dy * sqrt) / R) / 2),
		y = Math.round((y1 + y2 + (dy * dr2 + dx * sqrt) / R) / 2);

		intersections.push({x, y});
	}
	return intersections;
}
function calcTangencies(radii) {
	let
	tangencies = [],
	nums = [Math.floor(points.length / 2), Math.ceil(points.length / 2)];
	for (const i in points) tangencies.push([]);

	for (const num of nums) {
		for (let i = 0; i < points.length; i++) {
			const
			j = (i + num) % points.length,

			x1 = points[i].x,    y1 = points[i].y,
			x2 = points[j].x,    y2 = points[j].y,
			r1 = radii.small[i], r2 = radii.large[j],

			dx = x2 - x1, dy = y2 - y1,
			R   = dx ** 2 + dy ** 2, dr2 = r1 ** 2 - r2 ** 2,

			x = Math.round((x1 + x2 + dx * dr2 / R) / 2),
			y = Math.round((y1 + y2 + dy * dr2 / R) / 2);

			tangencies[i].push({x, y});
		}
	}
	return tangencies;
}
function fillInShape(radii, rectangle, intersections, tangencies) {
	const
	r = rectangle,
	canvasData = ctx.getImageData(r.x, r.y, r.width, r.height);

	for (let x = 0; x < r.width; x++) {
		for (let y = 0; y < r.height; y++) {
			let
			inside = true,
			skip   = false;

			for (let i = 0; i < points.length; i++) {
				const
				small = radii.small[i],
				point = points[i];

				if (distCoords(x + r.x, y + r.y, point.x, point.y) < small) {
					skip = true
					break;
				}
			}

			if (!skip) {
				for (let i = 0; i < points.length; i++) {
					const
					large = radii.large[i],
					point = points[i],

					intersection = intersections[i],
					tangency = tangencies[(i + Math.ceil(points.length / 2)) % points.length][0],
					radius = distCoords(intersection.x, intersection.y, tangency.x, tangency.y);



					if (distCoords(x + r.x, y + r.y, intersection.x, intersection.y) < radius) {
						inside = false;
						break;
					};

					if (distCoords(x + r.x, y + r.y, point.x, point.y) > large) {
						inside = false;
						break;
					}
				}
			}

			if (inside) {
				const index = (x + y * r.width) * 4;

				canvasData.data[index    ] = 0;
				canvasData.data[index + 1] = 0;
				canvasData.data[index + 2] = 0;
			}
		}
	}

	ctx.putImageData(canvasData, r.x, r.y);
}
function drawCircles(radii) {
	for (let i = 0; i < points.length; i++) {
		const
		p = points[i],
		color = 360 * i / points.length;

		ctx.strokeStyle = `hsl(${color}, 100%, 50%)`;

		if (radii.small[i] > 0) circle(p.x, p.y, radii.small[i]);
		circle(p.x, p.y, radii.large[i]);
	}
}
function drawLines(rectangle,intersections) {
	ctx.strokeStyle = "gray";

	for (const array of [points, intersections]) {
		const last = array[array.length - 1];

		ctx.beginPath();
		ctx.moveTo(last.x, last.y);

		for (const item of array) {
			ctx.lineTo(item.x, item.y);
			ctx.stroke();
		}
	}

	ctx.strokeStyle = "black";
	ctx.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
}

// draw helpers
function clearCanvas() {
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}
function distCoords(x1, y1, x2, y2) {
	return Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
}
function dist(i1, i2) {
	const
	p1 = points[i1 % points.length],
	p2 = points[i2 % points.length];
	return distCoords(p1.x, p1.y, p2.x, p2.y);
}
function circle(x, y, r) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI, true);
	ctx.stroke();
}
function line(x1, y1, x2, y2, color = "gray") {
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

function pointHandler(amount) {
	const
	pointContainer = document.querySelector("#point-container"),
	scale = Math.round(Math.min(canvas.width, canvas.height) / 3),
	randomness = 5 * scale / numPoints ** 2,
	radius = 10,
	diameter = 2 * radius,
	color = "rgba(200, 200, 200, 0.5)";

	constructPoints(amount, scale, randomness);

	pointStyle();

	const newPoint = i => {
		const div = document.createElement("div");
		div.setAttribute("class", "draggable");
		div.setAttribute("id", i);

		const span = document.createElement("span");
		span.setAttribute("class", "dot");
		div.appendChild(span);

		const p = document.createElement("p");
		p.setAttribute("class", "label");
		p.innerHTML = i;
		div.appendChild(p);

		return div;
	}

	for (let i = 0; i < points.length; i++) {
		const point = newPoint(i);
		makeDraggable(point);
		pointContainer.appendChild(point);

		const
		top  = points[i].y - radius,
		left = points[i].x - radius;

		point.style.top = top + "px";
		point.style.left = left + "px";
	}

	function pointStyle() {
		const style = document.createElement("style");
		
		style.innerHTML = `
			.draggable {
			  	position: absolute;
			  	text-align: center;

			  	background-color: transparent;
			  	width: ${diameter}px;
			  	overflow: visible;
			  	z-index: 2;
			}

			.label {
				background-color: transparent;
				user-select: none;
				color: magenta;
			}

			.dot {
			  	height: ${diameter}px;
			  	width:  ${diameter}px;

			  	background-color: ${color};
			  	cursor: pointer;
			  	border-radius: 50%;
			  	display: inline-block;
			  	vertical-align: top;
			}
		`;

		pointContainer.appendChild(style);
	}

	function constructPoints(amount, scale, randomness) {
		const randInt = () => Math.round((2 * Math.random() - 1) * randomness);

		for (let i = 0; i < amount; i++) {
			points.push({
				x: Math.round(
					Math.cos(2 * Math.PI * i / amount)* scale +
					document.body.clientWidth / 2 +
					randInt()
				),
				y: Math.round(
					Math.sin(2 * Math.PI * i / amount)* scale +
					document.body.clientHeight / 2 +
					randInt()
				)
			});
		}
	}

	function makeDraggable(element) {
		let x, y;

	    element.children[0].onmousedown = e => {
	    	e.preventDefault();

	    	const
	    	id = element.id,
	    	index = parseInt(id),
	    	p = points[index],
	    	ppos1 = points[(index + 1) % numPoints],
	    	ppos2 = points[(index + 2) % numPoints],
	    	pneg1 = points[(index + numPoints - 1) % numPoints],
	    	pneg2 = points[(index + numPoints - 2) % numPoints],
	    	warning = document.querySelector("#warning"),
	    	ineq = (point, center, p1, p2) => {
	    		const
	    		slope = (p2.y - p1.y) / (p2.x - p1.x),
	    		side = p => (p.y - p1.y) >= slope * (p.x - p1.x),
	    		pointSide = side(point),
	    		centerSide = side(center);

	    		return pointSide === centerSide;
	    	};


	    	y = e.clientY;
	    	x = e.clientX;

	    	document.onmouseup = () => {
		    	document.onmouseup = document.onmousemove = null;
	    	}

	    	document.onmousemove = e => {
	    		e.preventDefault();

	    		const
	    		top  = element.offsetTop  - (y - e.clientY),
	    		left = element.offsetLeft - (x - e.clientX);

	    		let temp = [...points];

		    	temp[index].y = top  + radius;
		    	temp[index].x = left + radius;

		   		y = e.clientY;
		    	x = e.clientX;

		    	let center = {
		    		x: 0,
		    		y: 0
		    	};
		    	for (const point of temp) {
		    		center.x += point.x;
		    		center.y += point.y;
		    	}
		    	center.x /= numPoints;
		    	center.y /= numPoints;

		    	const inBounds = ineq(p, center, pneg1, pneg2) &&
		    		ineq(p, center, ppos1, ppos2) &&
		    		!ineq(p, center, ppos1, pneg1);

		    	if (inBounds || numPoints <= 3) {
		    		points = temp;
			    	element.style.top  = top  + "px";
			    	element.style.left = left + "px";

		    		warning.style.display = "none";
		    	} else if (nonConvexityAllowed) {
		    		points = temp;
			    	element.style.top  = top  + "px";
			    	element.style.left = left + "px";

		    		warning.style.display = "inline";
		    	} else
		    		warning.style.display = "none";
	    	}
	  	}
	}
}