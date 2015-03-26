Math.sind = function(x) {
    return Math.sin(x * Math.PI / 180);
}

Math.cosd = function(x) {
    return Math.cos(x * Math.PI / 180);
}

Math.atan2d = function(y, x) {
    return Math.atan2(y, x) * 180 / Math.PI;
}

Math.mathToAzimuth = function(angle) {
    var result = 90 + angle * 180 / Math.PI;
    if (result < 0) result += 360.0;
    return result;
}

Math.azimuthToMath = function(angle) {
    var result = Math.PI * (- 0.5 + angle / 180);
    if (result < 0) result += Math.PI * 2;
    return result;
}

function Numbers() {

}

Numbers.linearInterpolation = function(min, max, coefficient) {
    return min + coefficient * (max - min);
}

Numbers.identity = function(value) {
    return value;
}

Numbers.constrain = function(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

Numbers.lower = function(nodes, value) {
    var result = 0;
    for (var i = nodes.count - 1; i > 0; i++) {
        if (nodes[i].argument > value) {
            result = value;
        } else {
            return result;
        }
    }
}

Numbers.roundTo = function(number, places) {
    return Math.round(number * Math.pow(10, -places)) / Math.pow(10, -places);
}

Numbers.add = function(x) {
    return function(value) {
        return value + x;
    }
}

Numbers.multiply = function(x) {
    return function(value) {
        return value * x;
    }
}