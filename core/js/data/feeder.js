function Feeder(boxes, rangeFrom, rangeTo) {
    this.boxes = boxes;
    this.sensors = []; //stores active sensors, property is concatenated sensorId and period
    this.rangeFrom = rangeFrom;
    this.rangeTo = rangeTo;
    
    // show range if live data
    //if (this.rangeFrom < 0 && this.rangeTo == 0) customer.container.displayLive(-this.rangeFrom);
    
    this.dateTo = (this.rangeTo == 0) ? new Date().getTime() : this.rangeTo;
    this.dateFrom = (this.rangeFrom < 0) ? this.dateTo + this.rangeFrom*1000 : this.rangeFrom;
    
    this.delta = this.dateTo - this.dateFrom;
    // [100] from settings, but this expects the data be from each second
    this.maxPoints = customer.getSettings().maxPoints * 1000;
    // if less points to show than max
    this.period = (this.delta <= this.maxPoints) ? 1000 : Math.round(1000*this.delta/this.maxPoints);
    this.widgetMaxPoints = (this.delta <= this.maxPoints) ? Math.round(this.delta/1000) : customer.getSettings().maxPoints;
    
    /* PINTO */
    this.device_timers = []; //stores time of last message from given station along with timeout functions, property is station serialNo
    this.timeout = 5000; //how long until we consider station inactive.. maybe set from outside ?
    this.latencyPrinter = setInterval(this.printLatency, 5000); //this is to be called from wherever it'll be needed
    /* /Pinto */

    console.log("[Feeder] Creating with box count: " + this.boxes.length);
    //console.log(this.boxes);

    var historyList = [];
    
    for (var b in this.boxes) {
        var box = this.boxes[b];
        
        for (var s in box.sensors) {
            var sensor = box.sensors[s];
            if (typeof sensor === 'undefined') {
                console.warn("Sensor undefined");
                delete box.sensors[s];
                continue;
            }
            sensor.period = this.period;
                

            if (box.settings.historical) {
                var found = false;
                for (var h in historyList) {
                    if (historyList[h].sensor.id == sensor.id) {
                        historyList[h].boxes.push(box);
                        found = true;
                    } 
                }
                if (!found) {
                    historyList.push({
                        sensor: sensor, 
                        boxes: [box], 
                        from: this.dateFrom, 
                        to: this.dateTo, 
                        //TODO: make null possible
                        //to: this._isLive() ? null : this.dateTo, 
                        period: this.period
                    });
                }
            }

            this.device_timers[sensor.deviceId] = {
                lastMsg: Date.now(),
                latency: 0,
                timeoutFunc: null
            }
            this.sensors[sensor.id + '-' + sensor.period] = sensor;
        }
    }
    
    var sensorList = [];
    for (var s in this.sensors) {
        sensorList.push(this.sensors[s]);
    }

    console.log("[Feeder] Creating with sensors count: " + sensorList.length);
    //console.log(sensorList);
    
    for (var i in historyList) {
        var box = historyList[i].boxes[0];
        var count = 0;
        for (var j in box.sensors) {
            count++;
        }
        box.setHistoricalCount(count);
    }
    
    async.concatSeries(historyList, this._getHistoricalData, function(err, items) {
        if (err) {
            console.error(err);
            return;
        }
    });

    if (this._isLive()) {
        customer.getSocket().registerSensors(sensorList);
    }
}

Feeder.prototype._isLive = function() {
    return (this.rangeTo == 0);
}

Feeder.prototype._getHistoricalData = function(item, callback) {
    var box = item.boxes[0];
    box.incHistoricalReceived().updateDescription();
    console.info('From ' + item.from + ' To ' + item.to + ' Period ' + item.period + ': ' + item.boxes.length);
    msg = new MessageSensorDataRequest(customer.sessionId, item.period, item.sensor.id, item.from, item.to, 'AVG');
    msg.done = function(data) {
        for (var i in data.ai) {
            for (var j in item.boxes) {
                item.boxes[j].addData(data.ai[i]);
            }
        }
        for (var j in item.boxes) {
            item.boxes[j].render();
        }
        callback(null, true);
    };
    msg.request();
};

Feeder.prototype.addBox = function(box) {
    var period = 1000;                             //TODO replace with period from box
    var sensorList = [];
    this.boxes.push(box);

    //register only if we don't already have required sensor
    for (var j in this.boxes[i].sensors) {
        var key = box.sensor_id + period.toString();
        if (!(key in this.sensors)) {
            this.sensors[key] = {
                serialNo: box.sensors[j].device_id,
                sensorId: this.boxes[i].sensors[j].sensor_id,
                period: this.boxes[i].sensors[j].period
            };
            sensorList.push(this.sensors[key]);
        }
    }
    if (sensorList.length > 0) {
        customer.getSocket().registerSensors(sensorList);
    }
}

//call with box as parameter, before it is deleted
//...not yet debugged ..or tried ..or finished
Feeder.prototype.removeBox = function(box) {
    //find which of the sensors are no longer used and remove them from this.sensors
    //also notify server to stop sending messages from given sensor
    for (var i in this.boxes) {
        if (this.boxes[i] == box) {
            //check if sensors are used elsewhere, otherwise remove
            var box_sensors = this.boxes[i].sensors;
            delete this.boxes[i];
            for (var j in box_sensors) {
                var used = false;
                for (var k in this.boxes) {
                    for (var l in this.boxes[k].sensors) { //can't remember when was the last time I had to use var l for iteration
                        if (this.boxes[k].sensors[l].sensor_id == box_sensors[j].sensor_id)
                            used = true;
                    }
                }
                if (!used) {
                    //TODO unregister single sensor
                    //socket.unregisterListener works only for whole device??
                }
            }
            //if we removed every sensor from a certain device, remove the device from latency watch
            for (var j in this.device_timers) {
                var used = false;
                for (var k in this.boxes) {
                    for (var l in this.boxes[k].sensors) {
                        if (this.boxes[k].sensors[l].device_id == j)
                            used = true;
                    }
                }
                if (!used) {
                    if (this.device_timers[j].timeoutFunc !== null) {
                        clearTimeout(this.device_timers[j].timeoutFunc);
                    }
                    //TODO delete graphics and stuff
                    console.log("[Feeder] Deleted device from watch");
                    delete this.device_timers[j];
                }
            }
            break;
        }
    }
}

//called from socket_handler on new data
Feeder.prototype.addData = function(data) {
    for (var i in this.boxes) {
        var refreshRequired = false;
        for (var j in this.boxes[i].sensors) {
            if (this.boxes[i].sensors[j].id === data.id) {
                refreshRequired = true;
                this.boxes[i].addData(data);
                this.updateLatency(this.boxes[i].sensors[j].deviceId);
            }
        }
        if (refreshRequired)
            this.boxes[i].render();
    }
}

Feeder.prototype.updateLatency = function(serialNo) {
    this.device_timers[serialNo].latency = Date.now() - this.device_timers[serialNo].lastMsg;
    this.device_timers[serialNo].lastMsg = Date.now();
    if (this.device_timers[serialNo].timeoutFunc !== null) {
        clearTimeout(this.device_timers[serialNo].timeoutFunc);
    }

    var self = this;
    this.device_timers[serialNo].timeoutFunc = setTimeout(jQuery.proxy(function() {
        self.notifyTimeout(serialNo);
    }, this), this.timeout);
}

//prints latency of all devices, run on interval
Feeder.prototype.printLatency = function() {
    for (var i in this.device_timers) {
        //TODO show this value to user instead of logging it to console
        //console.log("Timer " + i + " latency: " + container.feeder.device_timers[i].latency);
    }
}

//TODO dead/unresponsive device - notify user, notify which boxes are inactive
Feeder.prototype.notifyTimeout = function(serialNo) {
  //  console.log("[Feeder] Device " + serialNo + " is unresponsive!");
}

Feeder.prototype.pushData = function(dataPoint) {
    if (this.data.hasOwnProperty(dataPoint.timestamp)) {
        jQuery.extend(true, this.data[dataPoint.timestamp], dataPoint);
    } else {
        this.data[point.timestamp] = point;
        this.count++;
    }
    this.lastData = Math.max(this.lastData, point.timestamp);

    this.popOld();
    console.log(dataPoint);
}
