/**
 * Main class
 *
 * @returns
 */

function Message() {

    this.code = -1;

    this.request = function() {
        var postData = this.getData();
        //console.log("[Messages] Request #" + postData.c + (typeof postData.u == 'undefined' ? '' : ' u: ' + postData.u));

        jQuery.ajax({
            type: 'post',
            url: SERVER_ADDRESS,
            // The key needs to match your method's input parameter
            // (case-sensitive).
            data: JSON.stringify(postData),
            contentType: 'application/json',
            dataType: 'json'
        }).done(this.done).fail(this.fail);
    };

    this.socketRequest = function(ws) {
        var data = this.getData();
        //console.log("[Messages] Socket request #" + data.c + " u: " + data.u);
        data = JSON.stringify(data);
        ws.send(data);
    };

    this.done = function(data, textStatus, jqXHR) {
        console.log("[Messages] Message #" + data.c + ' done: ' + textStatus);
    };

    this.fail = function(jqXHR, textStatus, errorThrown) {
        console.log("[Messages] Message #" + this.code + ' fail: ' + errorThrown);
    };

    this.parseDouble = function(string) {
        return parseFloat(string);
    };
}

/**
 * Browser register listener
 *
 * @param uuid
 * @param period
 * @param serialNumber
 * @param sensorId
 * @returns
 */
function MessageRegisterListenerRequest(uuid, period, serialNumber, sensorId) {
    this.code = 11;
    this.uuid = uuid;
    this.period = period;
    this.serialNumber = serialNumber;
    this.sensorId = sensorId;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            pe: this.period,
            s: this.serialNumber,
            id: this.sensorId,
        };
    };
}

MessageRegisterListenerRequest.prototype = new Message();





/**
 * Browser unregister listener
 *
 * @param uuid
 * @param period
 * @param serialNumber
 * @param sensorId
 * @returns
 */
function MessageUnregisterListenerRequest(uuid, period, serialNumber, sensorId) {
    this.code = 14;
    this.uuid = uuid;
    this.period = period;
    this.serialNumber = serialNumber;
    this.sensorId = sensorId;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            pe: this.period,
            s: this.serialNumber,
            id: this.sensorId,
        };
    };
}

MessageUnregisterListenerRequest.prototype = new Message();


/**
 * Browser request historical data
 *
 * @param uuid
 * @param period
 * @param sensorId
 * @param rangeFrom
 * @param rangeTo
 * @param aggregate - one of: AVG, LAST
 * @returns
 */
function MessageSensorDataRequest(uuid, period, sensorId, rangeFrom, rangeTo, aggregate) {
    this.code = 15;
    this.uuid = uuid;
    this.period = period;
    this.sensorId = sensorId;
    this.rangeFrom = rangeFrom;
    this.rangeTo = rangeTo;
    this.aggregate = aggregate;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            pe: this.period,
            id: this.sensorId,
            rf: this.rangeFrom,
            rt: this.rangeTo,
            ag: this.aggregate
        };
    };
}

MessageSensorDataRequest.prototype = new Message();

/**
 * Browser login
 *
 * @param email
 * @param password
 * @returns
 */

function MessageLoginRequest(email, password) {
    this.code = 3;
    this.email = email;
    this.password = password;

    this.getData = function() {
        return {
            c: this.code,
            e: this.email,
            p: this.password
        };
    };

    this.fail = function(jqXHR, textStatus, errorThrown) {
        console.log('MessageLoginRequest fail: ' + errorThrown);
    };
}
MessageLoginRequest.prototype = new Message();




/**
 * Browser get container settings
 *
 * @param uuid
 * @returns
 */
function MessageContainerSettingGetRequest(uuid) {
    this.code = 18;
    this.uuid = uuid;

    // prepare the request
    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid
        };
    };

    // will return { c: 19, cs: data }
    this.validate = function(data, textStatus, jqXHR) {
        return (data.c == 19);
    };
}
MessageContainerSettingGetRequest.prototype = new Message();


/**
 * Browser set customer settings
 *
 * @param uuid String
 * @param settings Object
 * @returns
 */
function MessageContainerSettingSetRequest(uuid, settings) {
    this.code = 16;
    this.uuid = uuid;
    this.settings = settings;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            cs: this.settings // NULL will reset settings in the db - it will be automatically created for a user
                    /*
                     * TODO header, dashboards, ...
                     *
                     * create "container.getData()"
                     * this will return the array of all settings
                     */
        };
    };
}
MessageContainerSettingSetRequest.prototype = new Message();

/**
 * Device set settings
 *
 * @param uuid
 * @param serialNo
 * @param name
 * @param alias
 * @param location
 * @param latitude
 * @param longitude
 * @param elevation
 * @returns {MessageDeviceSettingSetRequest}
 */
function MessageDeviceSettingSetRequest(uuid, serialNo, name, alias, location, latitude, longitude, elevation) {
    this.code = 38;
    this.uuid = uuid;
    this.serialNo = serialNo;
    this.name = name;
    this.alias = alias;
    this.location = location;
    this.latitude = this.parseDouble(latitude);
    this.longitude = this.parseDouble(longitude);
    this.elevation = this.parseDouble(elevation);

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            s: this.serialNo,
            dname: this.name,
            dalias: this.alias,
            dlocation: this.location,
            lat: this.latitude,
            lon: this.longitude,
            ele: this.elevation
        };
    };
}
MessageDeviceSettingSetRequest.prototype = new Message();

/**
 * Browser get device list
 *
 * @param uuid
 * @returns
 */
function MessageDeviceListGetRequest(uuid) {
    this.code = 25;
    this.uuid = uuid;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid
        };
    };
}
MessageDeviceListGetRequest.prototype = new Message();

/**
 * Browser get sensor list
 *
 * @param uuid
 * @param serialNo
 * @returns
 */
function MessageSensorListGetRequest(uuid, serialNo) {
    this.code = 29;
    this.uuid = uuid;
    this.serialNo = serialNo;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            s: this.serialNo
        };
    };
}
MessageSensorListGetRequest.prototype = new Message();

function MessageArraySensorListGetRequest(uuid, deviceList) {
    this.code = 23;
    this.uuid = uuid;
    this.deviceList = deviceList;

    this.getData = function() {
        var messages = [];
        for (var i in this.deviceList) {
            messages.push({
                u: this.uuid,
                s: this.deviceList[i].s});
        }
        return {
            c: this.code,
            u: this.uuid,
            ic: 29,
            al: this.deviceList.length,
            ai: messages
        };
    };
}
MessageArraySensorListGetRequest.prototype = new Message();

/**
 * General command class
 *
 * @returns
 */
function MessageCommandRequest() {
    this.code = 32;
}
MessageCommandRequest.prototype = new Message();

/**
 * Browser get sensor logger file list
 *
 * @param uuid
 * @param sensorId
 * @returns
 */
function MessageCommandDirLogFilesRequest(uuid, sensorId) {
    this.uuid = uuid;
    this.sensorId = sensorId;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            s: this.sensorId,
            cmd: 'dirLogFiles'
        };
    };
}
MessageCommandDirLogFilesRequest.prototype = new MessageCommandRequest();


/**
 * Generic sensor command message
 *
 * @param uuid
 * @param sensorId
 * @param cmd Command Name
 * @returns
 */
function MessageCommandSensorRequest(uuid, sensorId, cmd) {
    this.uuid = uuid;
    this.sensorId = sensorId;
    this.cmd = cmd;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            s: this.sensorId,
            cmd: this.cmd
        };
    };
}
MessageCommandSensorRequest.prototype = new MessageCommandRequest();

/**
 * Generic set sensor
 *
 * @param uuid
 * @param sensorId
 * @param cmd
 * @param valueArray
 * @returns
 */
function MessageCommandSetRequest(uuid, sensorId, cmd, valueArray) {
    this.uuid = uuid;
    this.sensorId = sensorId;
    this.cmd = cmd;
    this.valueArray = valueArray;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            s: this.sensorId,
            cmd: this.cmd,
            valueArray: this.valueArray
        };
    };
}
MessageCommandSetRequest.prototype = new MessageCommandRequest();

/**
 * Browser set modbus
 *
 * @param uuid
 * @param sensorId
 * @param settings
 * @returns
 */
function MessageCommandSetModbusRequest(uuid, sensorId, settings) {
    this.uuid = uuid;
    this.sensorId = sensorId;
    this.settings = settings;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            s: this.sensorId,
            cmd: 'setModbusSetup',
            valueArray: [{value: settings}]
        };
    };
}
MessageCommandSetModbusRequest.prototype = new MessageCommandRequest();

// 1 267
// 2 523

/**
 * Browser download sensor logger file list
 *
 * @param uuid
 * @param sensorId
 * @param files
 * @returns
 */
function MessageCommandDownloadLogFilesRequest(uuid, sensorId, files) {
    this.uuid = uuid;
    this.sensorId = sensorId;

    this.getData = function() {
        return {
            c: this.code,
            u: this.uuid,
            s: this.sensorId,
            valueArray: [{valueArray: files}],
            cmd: 'downloadLogFiles'
        };
    };
}
MessageCommandDownloadLogFilesRequest.prototype = new MessageCommandRequest();

/**
 * Get timezones
 *
 * @param uuid
 * @returns
 */
function MessageTimezonesRequest(uuid) {
    this.uuid = uuid;

    this.getData = function() {
        this.code = 20;
        return {
            c: this.code,
            u: this.uuid
        };
    };
}
MessageTimezonesRequest.prototype = new Message();

/**
 * Get timezones
 *
 * @param uuid
 * @returns
 */
function MessageSensorDataExportRequest(uuid, period, sensors, rangeFrom, rangeTo) {
    this.uuid = uuid;
    this.period = period;
    this.sensors = sensors;
    this.rangeFrom = rangeFrom;
    this.rangeTo = rangeTo;

    this.getData = function() {
        this.code = 27;
        return {
            c: this.code,
            u: this.uuid,
            pe: this.period,
            rf: this.rangeFrom,
            rt: this.rangeTo,
            sensor_array: this.sensors,
            decimal_separator: '.',
            field_separator: ';',
            of: 0
        };
    };
}
MessageSensorDataExportRequest.prototype = new Message();

/**
 * {}
 *
 * @param uuid
 * @returns
 */
function MessageClientRequest(uuid, subcode, value) {
    this.uuid = uuid;
    this.subcode = subcode;
    this.value = value;
    
    this.getData = function() {
        this.code = 43;
        return {
            c: this.code,
            u: this.uuid,
            subcode: this.subcode,
            value: this.value
        };
    };
}
MessageClientRequest.prototype = new Message();
MessageClientRequest.prototype.SUB_UPDATE_DEVICE_PROPERTY = 6;