function Unit(settings) {
    if (typeof settings.name === 'undefined') {
        throw "Cannot create a unit without a name";
        return undefined;
    }
    this.name           = settings.name;

    this.displayName    = (typeof settings.displayName   === 'undefined') ? this.name                : settings.displayName;
    this.suffix         = (typeof settings.suffix        === 'undefined') ? (' ' + this.displayName) : settings.suffix;
    this.convert        = (typeof settings.convert       === 'undefined') ? Numbers.identity         : settings.convert;
    this.places         = (typeof settings.places        === 'undefined') ? 0                        : settings.places;
}