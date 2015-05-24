function Measure(settings) {
    this.id             = settings.id;
    this.name           = settings.name;
    this.quantity       = settings.quantity;
    this.verboseName    = settings.verboseName;
    this.hidden         = (typeof settings.hidden !== 'undefined') ? settings.hidden : false;
}

var measureList = [
    new Measure({id: 't_a',         name: 'ambientTemperature',             verboseName: 'ambient temperature',                 quantity: Quantities.temperature}),
    new Measure({id: 't_dp',        name: 'dewPoint',                       verboseName: 'dew point',                           quantity: Quantities.temperature}),
    new Measure({id: 't_wc',        name: 'windChill',                      verboseName: 'wind chill',                          quantity: Quantities.temperature}),
    new Measure({id: 't_hi',        name: 'humidex',                        verboseName: 'humidex',                             quantity: Quantities.temperature}),

    new Measure({id: 'p_a',         name: 'ambientPressure',                verboseName: 'ambient pressure',                    quantity: Quantities.pressure}),
    new Measure({id: 'p_sl',        name: 'seaLevelPressure',               verboseName: 'sea level pressure',                  quantity: Quantities.pressure}),
    new Measure({id: 'p_vH2O',      name: 'waterVapourPressure',            verboseName: 'water vapour pressure',               quantity: Quantities.pressure}),
    new Measure({id: 'p_vH2Os',     name: 'waterVapourSaturationPressure',  verboseName: 'water vapour saturation',             quantity: Quantities.pressure}),

    new Measure({id: 'wd',          name: 'windDirection',                  verboseName: 'wind direction',                      quantity: Quantities.azimuth}),

    new Measure({id: 'ws',          name: 'windSpeed',                      verboseName: 'wind speed',                          quantity: Quantities.speed}),
    new Measure({id: 'sos',         name: 'speedOfSound',                   verboseName: 'speed of sound',                      quantity: Quantities.speed}),

    new Measure({id: 'h_r',         name: 'relativeHumidity',               verboseName: 'relative humidity',                   quantity: Quantities.number}),

    new Measure({id: 'r',           name: 'rainfall',                       verboseName: 'rainfall',                            quantity: Quantities.distance}),
    
    new Measure({id: 'w',           name: 'weight',                         verboseName: 'weight',                              quantity: Quantities.weight}),
    new Measure({id: 'w_s',         name: 'weightStable',                  verboseName: 'weight stable',                       quantity: Quantities.weight}),

    //new Measure({id: 'd_air',       name: 'airDensity',                     verboseName: 'sea level pressure',                  quantity: Quantities.density}),
    new Measure({id: 'cc',          name: 'cloudCover',                     verboseName: 'cloud cover',                         quantity: Quantities.number,         hidden: true}),
    new Measure({id: 'json',        name: 'json',                           verboseName: 'json',                                quantity: Quantities.number,         hidden: true}),
    
    new Measure({id: 'log',        name: 'log',                           verboseName: 'log',                                quantity: Quantities.log,         hidden: true}),

];

MeasuresById = {};
Measures = {};

for (measure in measureList) {
    MeasuresById[measureList[measure].id] = measureList[measure];
    Measures[measureList[measure].name] = measureList[measure];
}