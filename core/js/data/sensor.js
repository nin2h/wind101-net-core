function Sensor(settings) {
    //console.log("[Sensor] Creating a sensor with settings:");
    //console.log(settings);

    if (typeof settings.id === 'undefined') {
        throw new ReferenceError("Sensor: id must not be empty");
    }
    this.id             = settings.id;

    if (typeof settings.deviceId === 'undefined') {
        throw new ReferenceError("Sensor: device id must not be empty");
    }
    this.deviceId       = settings.deviceId;

    this.measure        = settings.measure;
    this.name           = settings.name;
    this.period         = settings.period;
    this.source         = settings.source;
    this.resolution     = settings.resolution;

    this.description      = null; // if null, use only sensorName



    this.sourceOptions = {
        string: 'avg', // or 'x+y/2'
        from: -3600*1000, // - means relative, + absolute
        to: 0,
        originSource: null // instance of Sensor
    }

    /*console.log("Created a sensor:");
    console.dir(this);*/
}

Sensor.prototype.convert = function(value) {
    return this.measure.quantity.convert(value, customer.getSettings().units[this.measure.name]);
}

// 1 from device, 2 equation, 3 aggregation
// 1 is plain
// 2 has .string // cannot be null or empty
// 3 has .from = null; // if null, from the beginning
//      .to = null; // if null, till now
//      .method = 'avg' // cannot be null
//      .source alias of plain
// 4 last, like plain but comes from db
// if someone want to use elevation, he must use new virtual sensor elevation, which will be last
var SensorSources = {
    hw: 1,
    eq: 2,
    agg: 3,
    last: 4,
    wwo: 5,
    status: 6,
};