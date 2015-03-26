function Aggregator(settings) {
    if (typeof settings === 'undefined') return;
    
    this.sensors        = settings.sensors;
    this.timeout        = settings.timeout;
    this.pushedHistoric = false;
    this.sensorCount    = 0;
    for (var i in this.sensors) {
        this.sensorCount++;
    }
    this.reset();
}

Aggregator.prototype.reset = function() {
    this.data               = [];
    this.unread             = [];
    this.sums               = {};
    this.counts             = {};
    this.lastData           = undefined;
    this.lastCompleteData   = undefined;
    this.count              = 0;
}

Aggregator.prototype.createPoint = function(timestamp) {
    if (!this.data.hasOwnProperty(timestamp)) {
        this.data[timestamp] = {
            timestamp:  timestamp,
            timestep:   (typeof this.lastData === 'undefined') ? 0 : (timestamp - this.lastData),
            fields:     {},
            fieldCount: 0,
            complete:   false,
        }
        this.count++;
    }
}

Aggregator.prototype.addValue = function(point) {
    this.createPoint(point.timestamp);

    if (!this.data[point.timestamp].fields.hasOwnProperty(point.value)) {
        this.data[point.timestamp].fieldCount++;
    }

    this.data[point.timestamp].fields[point.sensorId] = point.value;
    this.lastData = point.timestamp;

    if (this.data[point.timestamp].fieldCount === this.sensorCount) {
        this.data[point.timestamp].complete = true;
        this.lastCompleteData = point.timestamp;
    }

    if (typeof this.sums[point.sensorId] === 'undefined') {
        this.sums[point.sensorId] = 0;
    }
    this.sums[point.sensorId] += point.value;

    if (typeof this.counts[point.sensorId] === 'undefined') {
        this.counts[point.sensorId] = 0;
    }
    this.counts[point.sensorId]++;
}

Aggregator.prototype.push = function(point) {
    this.addValue(point);
    this.markAsUnread(point.timestamp);
}

Aggregator.prototype.popOld = function() {
    var limit = new Date().getTime() / 1000 - this.timeout;
    for (point in this.data) {
        if (point < limit) {
            this.pop(point);
        }
    }
    
    limit = customer.getSettings().maxPoints;
    for (point in this.data) {
        if (this.count > limit) {
            this.pop(point);
        }
    }
}

Aggregator.prototype.pop = function(timestamp) {
    if (this.data.hasOwnProperty(timestamp)) {
        for (var field in this.data[timestamp].fields) {
            this.sums[field] -= this.data[timestamp].fields[field];
            this.counts[field]--;
        }

        delete this.data[timestamp];
        this.count--;
        this.markAsRead(timestamp);
    }
}

Aggregator.prototype.markAsUnread = function(timestamp) {    
    this.unread[timestamp] = true;
}

Aggregator.prototype.markAsRead = function(timestamp) {
    if (this.unread.hasOwnProperty(timestamp)) {
        delete this.unread[timestamp];
    }
}

Aggregator.prototype.getRawData = function(units, onlyNew) {    
    this.popOld();
    
    var result = [];
    var now = new Date().getTime() / 1000;

    for (var point in (onlyNew ? this.unread : this.data)) {
        var resultPoint = {
            timestamp:  this.data[point].timestamp,
            timestep:   this.data[point].timestep,
            freshness:  Numbers.constrain((now - this.data[point].timestamp) / this.timeout, 0, 1),
            fields:     {},
            fc:         this.data[point].fieldCount,
        };

        for (var field in this.data[point].fields) {
            resultPoint.fields[field] = customer.container.sensors[field].convert(this.data[point].fields[field]);
        }

        if (this.data[point].complete) {
            this.markAsRead(this.data[point].timestamp);
            result.push(resultPoint);
        }
    }
    
    return result.reverse();
}

Aggregator.prototype.getData = function(units) {
    return this.getRawData(units, false);
}

Aggregator.prototype.getNewData = function(units) {
    return this.getRawData(units, true);
}

Aggregator.prototype.getLastData = function(units, onlyComplete) {
    this.popOld();
    
    var timestamp = (onlyComplete ? this.lastData : this.lastCompleteData);

    if (typeof this.data[timestamp] === 'undefined') {
        return undefined;
    }

    var dataPoint = this.data[timestamp];
    var now = new Date().getTime() / 1000;

    var resultPoint = {
        timestamp:  dataPoint.timestamp,
        timestep:   dataPoint.timestep,
        freshness:  Numbers.constrain((now - dataPoint.timestamp) / this.timeout, 0, 1),
        fields:     {},
        complete:   dataPoint.complete,
    }

    for (var field in dataPoint.fields) {
        resultPoint.fields[field] = customer.container.sensors[field].convert(this.data[dataPoint.timestamp].fields[field]);
    }
    
    this.markAsRead(timestamp);
    
    return resultPoint;
}


Aggregator.prototype.getAverages = function(units) {
    var counts = {};
    var sums = {};
    var fields = {};
    var from = 1e10;
    var to = 0;

    for (var field in this.sensors) {
        fields[field] = this.sensors[field].measure.quantity.convert((this.sums[field] / this.counts[field]), units[this.sensors[field].measure.name]);
    }

    return {
        fields:     fields,
    };
}



AggregatorMultiline.prototype = new Aggregator();
AggregatorMultiline.prototype.constructor = AggregatorMultiline;

function AggregatorMultiline(settings) {
    this.sensors        = settings.sensors;
    this.timeout        = settings.timeout;
    this.deviceSensorCount    = {};
    for (var i in this.sensors) {
        if (typeof this.sensors[i] !== 'undefined') {
            if (typeof this.deviceSensorCount[this.sensors[i].deviceId] === 'undefined') {
                this.deviceSensorCount[this.sensors[i].deviceId] = 0;
            }
            this.deviceSensorCount[this.sensors[i].deviceId]++;
        }
    }
    this.reset();
}

AggregatorMultiline.prototype.popOld = function() {
    for (timestamp in this.data) {
        if (!this.unread.hasOwnProperty(timestamp)) {
            this.pop(timestamp);
        }
    }
};

AggregatorMultiline.prototype.addValue = function(point) {
    this.createPoint(point.timestamp);
    this.markAsUnread(point.timestamp);

    this.data[point.timestamp].fields[point.sensorId] = point.value;
    this.lastData = point.timestamp;
    
    if (this._hasAllDeviceSensors(point)) {
        this.data[point.timestamp].complete = true;
        this.lastCompleteData = point.timestamp;
    }
}

AggregatorMultiline.prototype._hasAllDeviceSensors = function (point) {
    var sensorCount = 0;
    var deviceId = this.sensors[point.sensorId].deviceId;
    for (var i in this.data[point.timestamp].fields) {
        if (this.sensors[i].deviceId == deviceId) sensorCount++;
    }
    return (sensorCount == this.deviceSensorCount[deviceId]);
}

/**
 * 
 * @returns {undefined}
 */

AggregatorOneRead.prototype = new Aggregator();
AggregatorOneRead.prototype.constructor = AggregatorOneRead;

function AggregatorOneRead(settings) {
    console.info("[AggregatorOneRead] Create");
    this.sensors        = settings.sensors;
    this.timeout        = settings.timeout;
    this.sensorCount    = 0;
    for (var i in this.sensors) {
        this.sensorCount++;
    }
    this.reset();
}

AggregatorOneRead.prototype.popOld = function() {
    for (timestamp in this.data) {
        if (!this.unread.hasOwnProperty(timestamp)) {
            this.pop(timestamp);
        }
    }
};

AggregatorWindroseVector.prototype = new Aggregator();
AggregatorWindroseVector.prototype.constructor = AggregatorWindroseVector;

function AggregatorWindroseVector(settings) {
    if (typeof settings === 'undefined') return;
    
    this.sensors        = settings.sensors;
    this.timeout        = settings.timeout;
    this.angleSeries    = settings.angleSeries;
    this.segments       = settings.segments;
    this.pushedHistoric = false;
    
    this.sensorCount    = 0;
    for (var i in this.sensors) {
        this.sensorCount++;
    }
    
    this.polygons = [];
    var maxSpeed = 5;
    var segmentStep = maxSpeed / this.segments;
    var angleStep = 360 / this.angleSeries;
    for (var s = 0; s < this.segments; s++) {
        var segmentStart = s*segmentStep;
        var segmentEnd = (s+1)*segmentStep;
        if (Math.round(segmentEnd) === Math.round(maxSpeed)) segmentEnd = null;
        var segment = {s: segmentStart, e: segmentEnd, angles: []};

        for (var a = 0; a < 360; a += angleStep) {
            segment.angles.push({s: a, e: a+angleStep, count : 0});
        }
        
        this.polygons.push(segment);
    }
    
    this.reset();
}

AggregatorWindroseVector.prototype.popOld = function() {
    var counter = [];
    var limit = new Date().getTime() / 1000 - this.timeout;
    for (point in this.data) {
        if (point < limit) {
            counter.push(point);
            this.pop(point);
        }
    }
    //console.info(counter);
    
    
}

//Aggregator.prototype.popAllButLast = function() {
//    for (var timestamp in this.data) {
//        for (var field in this.data[timestamp].fields) {
//            this.sums[field] -= this.data[timestamp].fields[field];
//            this.counts[field]--;
//        }
//
//        delete this.data[timestamp];
//        this.count--;this.markAsUnread(point.timestamp);
//        this.markAsRead(timestamp);
//        if (this.count <= 1) return;
//    }
//}