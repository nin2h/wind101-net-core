var SocketHandler = function(url) {
    this.url = url;
    this.ws = null; // WebSocket
    this.msgQueue = [];
    this.isOpening = false;
    this.socketSensorData = []; // array
    
    // sensors via ws
    this.sensorReadStart = null;
    this.sensorsToRead = 0;
    this.size = 0;
}

/**
 * @param function onopen
 */
SocketHandler.prototype.open = function() {
    console.log("[Socket handler] Opening URL '" + this.url + "'");

    this.ws = new WebSocket(this.url);
    this.ws.onopen = jQuery.proxy(this.emptyQueue, this);
    this.ws.onmessage = this.onmessage;
    this.ws.onclose = this.onclose;
    this.ws.onerror = this.onerror;
};

SocketHandler.prototype.sendQueue = function() {
    console.log("[Socket handler] Send queue, registering listener for session ID " + customer.sessionId + " with " + customer.getSocket().socketSensorData.length + " sensors");
    
    if (this.ws === null) {
        if (!this.isOpening) {
            this.isOpening = true;
            this.open();
        } else {
            console.error('[Socket handler] Should not happen in parallel');
        }
    } else if (this.ws.readyState === 0) {
        console.error('[Socket handler] Should not happen in parallel');
    } else {
        this.emptyQueue();
    }
};

SocketHandler.prototype.emptyQueue = function() {
    console.log("[Socket handler] Empty queue");
    for (var i in this.msgQueue) {
        if (this.msgQueue[i].state === 0) {
            this.msgQueue[i].state = 1;
            var msg = this.msgQueue[i].msg;
            msg.socketRequest(this.ws);
        }
    }
};

SocketHandler.prototype.readAllSensors = function() {
    /* 1 by 1 */
    /*var devices = customer.container.deviceList;
    for (var i in devices) {
        var msg = new MessageSensorListGetRequest(customer.sessionId, devices[i].s);
        this._addToQueue(msg);
    }*/
    
    var msg = new MessageArraySensorListGetRequest(customer.sessionId, customer.container.deviceList);
    this._addToQueue(msg);
    this.sendQueue();
};

SocketHandler.prototype.registerSensors = function(sensors) {
    var socketSensorData = this.socketSensorData;
    for (var i in sensors) {
        var sensor = sensors[i];
        var sensorData = new SocketSensorData(customer.sessionId, sensor.deviceId, sensor.id, sensor.period);
        socketSensorData.push(sensorData);
        
        console.log("[Socket handler] Registering sensor " + sensorData.sensorId + " of device " + sensorData.serialNo);
        if (!sensorData.isRegistered()) {
            sensorData.setRegistered();
            var registerListener = new MessageRegisterListenerRequest(sensorData.sessionId, sensorData.period, sensorData.serialNo, sensorData.sensorId);
            this._addToQueue(registerListener);
        }
    }
    this.sendQueue();
};

SocketHandler.prototype.unregisterAll = function() {
    for (var i in this.socketSensorData) {
        this.unregisterSensor(this.socketSensorData[i]);
    }
};

SocketHandler.prototype.unregisterSensor = function(sensorData) {
    var unregisterListener = new MessageUnregisterListenerRequest(sensorData.sessionId, sensorData.period, sensorData.serialNo, sensorData.sensorId);
    unregisterListener.socketRequest(this.ws);
};

SocketHandler.prototype._addToQueue = function(msg) {
    this.msgQueue.push({msg: msg, state: 0});
};

/**
 * update all dash-boards with new evt.data
 *
 * @param Array evt
 */
SocketHandler.prototype.onmessage = function(evt) {
    if (customer.container.debugShowIncomingData)
        console.log(evt.data);
    
    var jsonData = JSON.parse(evt.data);

    /**
     * getHwInfo
     *
     * {"valueArray":[{"valueArray":[{"value":1325377882}],"cmd":"readInputRegister","c":34,"status":""}],"cmd":"getTime","status":"Done","c":34}
     */
    if (jsonData.c === 34 && jsonData.cmd === 'getHwInfo') {
        console.log(jsonData.valueArray);
        customer.container.device.showInfo('VIA_COLLECTOR', jsonData.valueArray);
        return;
    }

    /**
     * Calibration
     */
    if (jsonData.c === 34 && jsonData.cmd === 'getCalibration') {
        console.log(jsonData.valueArray);
        customer.container.device.showCalibration(jsonData.valueArray);
        return;
    }

    if (jsonData.c === 34 && jsonData.cmd === 'setCalibration') {
        console.log(jsonData);
        if (jsonData.status === 'Done') {
            customer.getSocket().getCalibration();
        }
        return;
    }

    /**
     * getTime
     *
     * {"valueArray":[{"valueArray":[{"value":1325377882}],"cmd":"readInputRegister","c":34,"status":""}],"cmd":"getTime","status":"Done","c":34}
     */
    if (jsonData.c === 34 && jsonData.cmd === 'getTime') {
        console.log(evt.data);
        customer.container.device.showTime(jsonData.valueArray[0].valueArray[0].value);
        return;
    }

    /**
     * setTime
     *
     * {"valueArray":[],"cmd":"setTime","c":34}
     */
    if (jsonData.c === 34 && jsonData.cmd === 'setTime') {
        console.log(jsonData);
        customer.container.onSetTime();
        return;
    }

    /**
     * setModbusSetup
     *
     * {"valueArray":["ERROR],"cmd":"setModbusSetup","c":34}
     */
    if (jsonData.c === 34 && jsonData.cmd === 'setModbusSetup') {
        console.log(jsonData);
        return;
    }

    /**
     * LoggerConfig
     */
    if (jsonData.c === 34 && jsonData.cmd === 'getLoggerConfig') {
        console.log(jsonData);
        customer.container.device.showLoggerConfig(jsonData.valueArray);
        return;
    }

    if (jsonData.c === 34 && jsonData.cmd === 'setLoggerConfig') {
        console.log(jsonData);
        if (jsonData.status === 'Done') {
            customer.getSocket().getLoggerConfig();
        }
        return;
    }

    /**
     * dirLogFiles
     *
     * {"valueArray":["2014/04/20140426-1114.csv","2014/04/20140430-1037.csv"],"cmd":"dirLogFiles","c":34}
     */
    if (jsonData.c === 34 && jsonData.cmd === 'dirLogFiles') {
        console.log(jsonData);
        customer.container.device.showLogFiles(jsonData.valueArray);
        return;
    }

    /**
     * dirLogFiles
     *
     * {"valueArray":["Done"],"cmd":"downloadLogFiles","c":34}
     */
    if (jsonData.c === 34 && jsonData.cmd === 'downloadLogFiles') {
        console.log(jsonData);
        customer.container.device.loggedDownloadFinished();
        return;
    }

    /**
     * downloadLogFiles
     *
     * {"valueArray":["downloaded","/home/nino/barani/wind101/download/541459228/20120101-0000.csv"],"cmd":"downloadLogFiles","c":35}
     * {"valueArray":["imported",  "/home/nino/barani/wind101/download/541459228/20120102-0029.csv"],"cmd":"downloadLogFiles","c":35}
     * {"valueArray":["2014/09/20140914-0000.csv", "Ready to recieve file: 20140914-0000.csv File size: 15196647", "status: "downloadStarted"}
     */
    if (jsonData.c === 35 && jsonData.cmd === 'downloadLogFiles') {
        console.log(jsonData);
        customer.container.device.updateLogFiles(jsonData);
        return;
    }
    
    /**
     * getSensorListArray
     */
    if (jsonData.c === 23 && jsonData.ic === 30) {
        customer.container.addSensors(jsonData);
        customer.getSocket().size += evt.data.length;
        return;
    }
    
    /**
     * getDataArray
     */
    if (jsonData.c === 23 && jsonData.ic === 17 && customer.container.feeder) {
        this.size += evt.data.length;
        for (var i in jsonData.ai) {
            customer.container.feeder.addData(jsonData.ai[i]);
        }
        
        customer.socket.sensorsToRead--;
        if (customer.socket.sensorsToRead <= 0) {
            console.log('Total received data size: ' + customer.getSocket().size);
            customer.container.onAllData();
        }
        return;
    }
    
    if (customer.container.feeder)
        customer.container.feeder.addData(jsonData);
};

SocketHandler.prototype.onclose = function() {
    console.log("[Socket handler] Socket closed!");
};

SocketHandler.prototype.onerror = function(err) {
    console.log("[Socket handler] Socket error: '" + err + "'");
};

/**
 * command
 * @param string serialNo
 */
SocketHandler.prototype.dirLogFiles = function() {
    var command = new MessageCommandDirLogFilesRequest(customer.sessionId, customer.container.device.serialNo);
    command.socketRequest(this.ws);
};

/**
 * command
 */
SocketHandler.prototype.getHwInfo = function(serial) {
    var command = new MessageCommandSensorRequest(customer.sessionId, serial, 'getHwInfo');
    command.socketRequest(this.ws);
};

/**
 * command
 */
SocketHandler.prototype.getCalibration = function() {
    var command = new MessageCommandSensorRequest(customer.sessionId, customer.container.device.serialNo, 'getCalibration');
    command.socketRequest(this.ws);
};

/**
 * command
 * @param valueArray
 */
SocketHandler.prototype.setCalibration = function(valueArray) {
    var command = new MessageCommandSetRequest(customer.sessionId, customer.container.device.serialNo, 'setCalibration', valueArray);
    command.socketRequest(this.ws);
};

/**
 * command
 */
SocketHandler.prototype.getLoggerConfig = function() {
    var command = new MessageCommandSensorRequest(customer.sessionId, customer.container.device.serialNo, 'getLoggerConfig');
    command.socketRequest(this.ws);
};

/**
 * command
 * @param valueArray
 */
SocketHandler.prototype.setLoggerConfig = function(valueArray) {
    var command = new MessageCommandSetRequest(customer.sessionId, customer.container.device.serialNo, 'setLoggerConfig', valueArray);
    command.socketRequest(this.ws);
};

/**
 * command
 * @param string serialNo
 */
SocketHandler.prototype.getTime = function() {
    var command = new MessageCommandSensorRequest(customer.sessionId, customer.container.device.serialNo, 'getTime');
    command.socketRequest(this.ws);
};

/**
 * command
 * @param string serialNo
 */
SocketHandler.prototype.setTime = function() {
    var ts = Math.ceil(new Date().getTime() / 1000);
    var command = new MessageCommandSetRequest(customer.sessionId, customer.container.device.serialNo, 'setTime', [{value:ts}]);
    command.socketRequest(this.ws);
};

/**
 * command
 * @param string serialNo
 * @param Array files
 */
SocketHandler.prototype.downloadLogFiles = function(serialNo, files) {
    var command = new MessageCommandDownloadLogFilesRequest(customer.sessionId, serialNo, files);
    command.socketRequest(this.ws);
};

SocketHandler.prototype.getData = function(period, sensorId, rangeFrom, rangeTo, aggregate) {
    var msg = new MessageSensorDataRequest(customer.sessionId, period, sensorId, rangeFrom, rangeTo, aggregate);
    msg.socketRequest(this.ws);
};

var SocketSensorData = function(sessionId, serialNo, sensorId, period)
{
    //TODO: more websocket servers! or http too?
    this.serverUrl = null;
    this.sessionId = sessionId;
    this.period = period; // 1 = 1sec...
    this.serialNo = serialNo;
    this.sensorId = sensorId;
    this.status = 1; // 1 not registered, 2 registered

    this.isRegistered = function() {
        return (this.status === 2);
    };

    this.setRegistered = function() {
        this.status = 2;
    };
};
