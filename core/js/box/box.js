Box.prototype = new Configurable();
Box.prototype.constructor = Box;

function Box(hardSettings) {
    Configurable.apply(this, arguments);
    if (typeof hardSettings === 'undefined')
        return;

    //console.debug("[Box] Created:");
    //console.debug(this);

    this.widget = null;
    this.sensors = {};
    
    // description
    this.lastReceived = null;
    this.historicalCount = 0;
    this.historicalReceived = 0;

    return this;
}

Box.prototype.addData = function(dataPoint) {
    this.aggregator.push({
        timestamp: dataPoint.ts / 1000,
        sensorId: dataPoint.id,
        value: dataPoint.value,
    });
    return this.updateReceived(dataPoint.ts).updateDescription();
};

Box.prototype.setHistoricalCount = function(count) {
    this.historicalCount = count;
    return this;
};

Box.prototype.updateReceived = function(ts) {
    this.lastReceived = ts;
    return this;
};

Box.prototype.incHistoricalReceived = function() {
    this.historicalReceived++;
    return this;
};

Box.prototype.updateDescription = function() {
    var text = '';
    for (var i in this.sensors) {
        var s = this.sensors[i];
        if (s) {
            text += 'Period: ' + Math.round(s.period/1000) + ' sec ';
            break;
        }
    }
    
    if (this.lastReceived === null) {
        text += '[No data] ';
    } else {
        var d = new Date();
        text += '[Delay: ' + (Math.round(100*(d.valueOf() - this.lastReceived)) / 100000) + ' sec] ';
    }
    
    if (this.$obj) {
        this.$obj.find('span.wind101-desc').text(text);
    }
    
    return this;
};

Box.prototype.render = function() {
    if (this.widget !== null) {
        this.widget.fetchData(customer.getSettings().units);
        this.widget.render();
    }
};

Box.prototype.getDOM = function() {
    console.debug("[Box] Getting DOM");
    this.createWidget();
    this.createSettingsDropdown();
    return this.$obj.uniqueId();
}

Box.prototype.setPosition = function(x, y) {
    this.softSettings.position = {
        x: x.toFixed(0),
        y: y.toFixed(0),
    };
    
    this.settings.position = {
        x: x.toFixed(0),
        y: y.toFixed(0),
    };
    //this.extendSoftSettings( { position: { x: x.toFixed(0), y: y.toFixed(0),} } );
}

Box.prototype.extendSoftSettings = function(softSettings) {
    Configurable.prototype.extendSoftSettings.apply(this, arguments);
    //console.debug("[Box] Extended soft settings with object:");
    //console.debug(softSettings);
    //console.debug(this.settings.sensors);

    for (var i in this.settings.sensors) {
        this.sensors[i] = customer.container.sensors[i];
    }

    this.aggregator = new Aggregator({
        timeout: this.settings.timeout,
        sensors: this.sensors,
    });

    return this;
}

Box.prototype.createWidget = function() {
    //console.debug("[Box] Sensors are:");
    //console.debug(customer.container.sensors);
    if (this.widget !== null) {
        console.error("[Box] Widget already exists in box:");
        console.error(this);
    }
}

Box.prototype.createSettingsDropdown = function() {
    jQuery.ajax({
        url: 'assets/html/box-options.html',
        dataType: 'html'
    }).done(jQuery.proxy(function(data) {
                        this.$obj.find('div.dropdown').html(data);
                        var $removeButton =  this.$obj.find('button.wind101-remove');
                        $removeButton.click(jQuery.proxy(function() {
                            for (var b in customer.container.dashboards[customer.container.activeDashboard].boxes) {
                                var box = customer.container.dashboards[customer.container.activeDashboard].boxes[b];
                                if (box === this) {
                                    customer.container.dashboards[customer.container.activeDashboard].boxes.splice(b, 1);
                                    customer.saveSettings(true);
                                    return;
                                }
                            }
        }, this));

        this.$obj.find('div.dropdown').after($removeButton);

        this.$obj.find('ul.wind101-columns a.btn').on('click', jQuery.proxy(function(event) {
            var target = jQuery(event.target);
            this.changeSize(target.data('size'), true);
        }, this));

        // settings
        var box = this;
        this.$obj.find(".btn_set").click(jQuery.proxy(function(event) {
            window.scrollTo(0, 0);
            event.stopPropagation();
            var modal = jQuery("#dashboardWidgetOption");

            form = new FormWidgetSettings(modal, 'FormWidgetSettings', box);
            form.init();
            form.render();
            modal.modal('show');
        }, this));
        
        // export
        var $exportBtn = this.$obj.find('div.dropdown .wind101-export');
        if (this.settings.id === 'multiline') {
            $exportBtn.click(jQuery.proxy(function(event) {
                window.scrollTo(0, 0);
                event.stopPropagation();
                var modal = jQuery("#modal-export");
                modal.modal('show');
                modal.find('.wind101-export').unbind().click(jQuery.proxy(function(event) {
                    alert('export started');
                    console.info('export');
                    console.info(this);
                    var sensors = [];
                    for (var i in this.sensors) {
                        sensors.push({sensor_id: this.sensors[i].id});
                    }
                    var msg = new MessageSensorDataExportRequest(customer.sessionId,
                        0, //period
                        sensors,
                        customer.container.getActiveDashboard().settings.rangeFrom,
                        customer.container.getActiveDashboard().settings.rangeTo
                    );
                    msg.socketRequest(customer.socket.ws);
                }, this));
            }, this));
        } else {
            $exportBtn.hide();
        }        
        
    }, this));
};

Box.prototype.changeSize = function (size, save) {
    var sizes = {
        "3x3":  { divSizeClass: "col-md-6 col-lg-3 sm-col",      chartSizeClass: "sm-col"},
        "6x3":  { divSizeClass: "col-lg-6 sm-col",               chartSizeClass: "sm-col"},
        "9x3":  { divSizeClass: "col-lg-9 sm-col",               chartSizeClass: "sm-col"},
        "12x3": { divSizeClass: "col-lg-12 sm-col",              chartSizeClass: "sm-col"}, 
        "6x6":  { divSizeClass: "col-lg-6 col-md-6 big-col",     chartSizeClass: "big-col"}, 
        "12x6": { divSizeClass: "col-lg-12 big-col",             chartSizeClass: "big-col"},
    };
    var classesToRemove = 'col-lg-1 col-lg-2 col-lg-3 col-lg-4 col-lg-5 col-lg-6 col-lg-7 col-lg-8 col-lg-9 col-lg-10 col-lg-11 col-lg-12 col-md-6 big-col sm-col';
    
    var div = this.$obj;
    div.removeClass(classesToRemove).addClass(sizes[size].divSizeClass);
    div.find('div.chart').removeClass('sm-col big-col').addClass(sizes[size].chartSizeClass);
    
    // workaround for height start
    switch(div.find('div.chart').css('height')) {
        case '276px':
        case '540px':
            var height = (sizes[size].chartSizeClass == 'sm-col') ? '276px' : '540px';
            div.find('div.chart').css('height', height);
            break;
    }
    // workaround for height end
        
    if(!this.widget) {
        console.warn('Render with no widget!');
    } else if(this.widget.highcharts) {
        this.widget.highcharts.reflow();
    }
            
    if(save) {
        this.extendSoftSettings( { size:size } );
    }
};

Box.prototype.setSize = function(size) {
    if(!size)
        size = this.settings.size;
    
    this.changeSize(size);
};
