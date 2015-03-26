function ObjectWaiter(arr) {
    this.arr = arr;
    this.done = null;
    return this;
}

ObjectWaiter.prototype.sensors = function() {
    console.log("[Object waiter] Sensors() called");
    //console.log("CALLER FUNCTION: " + arguments.callee.caller);

    //check if done function is defined
    if (!this.done) {
        console.error("[Object waiter] No done function defined");
    }

    //check if arguments (arr) arent empty
    this.count = this.arr.length;
    if (this.count === 0) {
        throw "Cannot process empty array";
    }
    
    //check if all items have deviceId
    
    //console.log("---------------");
    //console.log(this.arr);
    for(var i in this.arr)
        if (!this.arr[i].deviceId) {
            throw 'All items must have deviceId defined';
        }

    var self = this;
    async.concatSeries(this.arr, this._loadSensors, function(err, sensors) {
        console.log("[Object waiter] All functions done");
        if (err)
            console.error(err);

        self.done(sensors);
    });
};

ObjectWaiter.prototype._loadSensors = function(item, callback) {
    var deviceId = item.deviceId;  
    var sensorId = item.sensorId;

    //check whether the sensor isnt created already (only when loading specific sensor)
    if (sensorId && typeof customer.container.sensors[sensorId] !== 'undefined') {
        callback(null, 'sensor already exists:' + sensorId);
        return;
    }
    
    //check whether the device isnt created already (only when loading specific device)
//    if (!sensorId && deviceId) {
//        for (var i in customer.container.sensors) {
//            if (customer.container.sensors[i] == deviceId) {
//                callback(null, 'device already exists:' + deviceId);
//                return;
//            }
//        }
//    }

    //request sensors for current processing device
    var sensorRequest = new MessageSensorListGetRequest(customer.sessionId, deviceId);
    sensorRequest.done = function(data, textStatus, jqXHR) {
        var sensorList = data.ai;

        //process every sensor
        for (var s in sensorList) {
            var sensor = sensorList[s];

            //check whether the sensor isnt created already
            if (typeof customer.container.sensors[sensor.id] === 'undefined') {
                customer.container.sensors[sensor.id] = new Sensor({
                    id: sensor.id,
                    deviceId: deviceId,
                    name: sensor.name,
                    measure: MeasuresById[sensor.measure],
                    period: sensor.pe,
                    source: sensor.source_id,
                    resolution: 0,
                });
            }
        }
        callback(null, sensorList);
    };
    sensorRequest.request();
};