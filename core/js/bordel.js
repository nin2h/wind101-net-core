/**
 *      THIS FILE CONTAINS STUFF THAT SHOULD BE READ FROM SETTINGS LATER ON.
 *      FEEL FREE TO SUGGEST A MECHANISM THAT WILL TAKE CARE OF IT.
 *      Kvík’s on this one.
 */

var Units = {
    windSpeed: 'mps',
    windDirection: 'degree',
    relativeHumidity: 'percent',
    ambientPressure: 'pascal',
    ambientTemperature: 'celsius',
    rainfall: 'umps',
    log: 'count',
};

globalSoftSettings = {
    position: {
        x: 0,
        y: 0,
    },
};

defaultBoxSettings = {
    'gauge':                { size: '3x3',  title: 'Gauge',      timeout: 60,   },
    'graph.multiline':      { size: '12x3', title: 'Multiline',  timeout: 120,  },
    'windrose.velocity':    { size: '3x3',  title: 'Windrose',   timeout: 60,   },
    'windrose.smoketrail':  { size: '3x3',  title: 'Smoketrail', timeout: 60,   },
    'averages':             { size: '6x3',  title: 'Averages',   timeout: 60,   },
};

Units.___airDensity = function(temperature, humidity, pressure) {
    var ppH2O = this.saturationPressureH2O(temperature) * humidity / 100.0;
    var ppO2 = pressure - ppH2O;
    return (ppO2 / (287.05 * temperature)) + (ppH2O / (461.495 * temperature));
};

Units.___saturationPressureH2O = function(temperature) {
    var p = 0;
    p = -3.0994571e-20 + temperature * p;
    p = 1.1112018e-17 + temperature * p;
    p = -1.7892321e-15 + temperature * p;
    p = 2.1874425e-13 + temperature * p;
    p = -2.9883885e-11 + temperature * p;
    p = 4.3884187e-09 + temperature * p;
    p = -6.1117958e-07 + temperature * p;
    p = 7.8736169e-05 + temperature * p;
    p = -9.0826951e-03 + temperature * p;
    p = 0.99999683 + temperature * p;
    return (6.1078 / Math.pow(p, 8.0));
}