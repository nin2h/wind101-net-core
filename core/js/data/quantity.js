function Quantity(settings) {
    if (typeof settings.name === 'undefined') {
        throw "Cannot create a quantity without a name";
        return undefined;
    }

    this.name       = settings.name;
    this.units      = settings.units;
}

Quantity.prototype.convert = function(value, unit) {
    if (!this.units.hasOwnProperty(unit)) {
        throw "Cannot convert " + this.name + " " + value + " to " + unit + "!";
    }

    return Numbers.roundTo((this.units[unit].hasOwnProperty('convert') ? this.units[unit].convert(value) : value), this.units[unit].places);
}

Quantities = {
    number: new Quantity({
        name:       'number',
        units:      {
            one:            new Unit({name: 'unit',                     displayName: '1',           suffix: '',         convert: undefined,                     places:  0}),
            percent:        new Unit({name: 'percent',                  displayName: '%',           suffix: undefined,  convert: Numbers.multiply(100),         places: -1}),
        },
    }),

    temperature: new Quantity({
        name:       'temperature',
        units:      {
            kelvin:         new Unit({name: 'Kelvin',                   displayName: 'K',           suffix: undefined,  convert: undefined,                     places: -1}),
            celsius:        new Unit({name: 'degree Celsius',           displayName: '°C',          suffix: undefined,  convert: Numbers.add(-273.15),          places: -1}),
            fahrenheit:     new Unit({name: 'degree Fahrenheit',        displayName: '°F',          suffix: undefined,  convert: function(value) { return value * 1.8 - 459.67; },      places: -1}),
        },
    }),

    pressure: new Quantity({
        name:       'pressure',
        units:      {
            pascal:         new Unit({name: 'Pascal',                   displayName: 'Pa',          suffix: undefined,  convert: undefined,                     places:  0}),
            mbar:           new Unit({name: 'millibar',                 displayName: 'mbar',        suffix: undefined,  convert: Numbers.multiply(0.01),        places: -2}),
            mmHg:           new Unit({name: 'millimetre of mercury',    displayName: 'mm Hg',       suffix: undefined,  convert: Numbers.multiply(0.007501),    places: -1}),
            mmH2O:          new Unit({name: 'millimetre of water',      displayName: 'mm H₂O',      suffix: undefined,  convert: Numbers.multiply(0.1019716),   places:  0}),
            torr:           new Unit({name: 'Torr',                     displayName: 'Torr',        suffix: undefined,  convert: Numbers.multiply(0.007501),    places: -1}),
        },
    }),

    speed: new Quantity({
        name:       'speed',
        units:      {
            mps:            new Unit({name: 'metre per second',         displayName: 'm/s',         suffix: undefined,  convert: undefined,                     places: -2}),
            mmps:           new Unit({name: 'millimetre per second',    displayName: 'mm/s',        suffix: undefined,  convert: Numbers.multiply(0.001),       places: -2}),
            umps:           new Unit({name: 'micrometre per second',    displayName: 'μm/s',        suffix: undefined,  convert: Numbers.multiply(0.001),       places:  0}),
            mmph:           new Unit({name: 'millimetre per hour',      displayName: 'mm/h',        suffix: undefined,  convert: Numbers.multiply(0.001),       places: -2}),
            mph:            new Unit({name: 'metre per hour',           displayName: 'm/h',         suffix: undefined,  convert: Numbers.multiply(0.001),       places: -2}),
            kmph:           new Unit({name: 'kilometre per hour',       displayName: 'km/h',        suffix: undefined,  convert: Numbers.multiply(3.6),         places: -1}),
            kt:             new Unit({name: 'knots',                    displayName: 'kt',          suffix: undefined,  convert: Numbers.multiply(1.944),       places: -1}),
        },
    }),

    azimuth: new Quantity({
        name:       'azimuth',
        units:      {
            degree:         new Unit({name: 'degree',                   displayName: 'degrees',     suffix: '°',        convert: undefined,                     places: 0}),
            mil:            new Unit({name: 'mil',                      displayName: 'mil',         suffix: undefined,  convert: Numbers.multiply(160/9),       places: 0}),
        }
    }),

    distance: new Quantity({
        name:       'distance',
        units:      {
            metre:          new Unit({name: 'metre',                    displayName: 'm',           suffix: undefined,  convert: undefined,                     places: 0}),
            millimetre:     new Unit({name: 'millimetre',               displayName: 'mm',          suffix: undefined,  convert: Numbers.multiply(1000),        places: 0}),
        }
    }),
    
    log: new Quantity({
        name:       'log',
        units:      {
            count:          new Unit({name: 'count',                    displayName: '',            suffix: undefined,  convert: function(value) { return JSON.parse(value).count; },   places: -3}),
            speed:          new Unit({name: 'speed',                    displayName: 'item/s',      suffix: undefined,  convert: function(value) { return value.speed; },    places: 0}),
            detail:         new Unit({name: 'detail',                   displayName: '',            suffix: undefined,  convert: function(value) { return value.detail; },   places: 0}),
            serial:         new Unit({name: 'serial',                   displayName: '',            suffix: undefined,  convert: function(value) { return value.s; },   places: 0}),            
        }
    }),
}