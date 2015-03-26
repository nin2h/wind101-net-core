function Configurable(hardSettings) {
    this.hardSettings = hardSettings;
    this.collectSettings();
}

Configurable.prototype.collectSettings = function() {
    this.settings = jQuery.extend(true, {}, this.hardSettings, this.softSettings);
}

Configurable.prototype.getSoftSettings = function() {
    return this.softSettings;
}

Configurable.prototype.extendSoftSettings = function(softSettings) {
    this.softSettings = jQuery.extend(true, {}, this.softSettings, softSettings);
    this.collectSettings();
}

Configurable.prototype.applySettings = function() {
    throw "Cannot apply settings on virtual object Configurable!";
}