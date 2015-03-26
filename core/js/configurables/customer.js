Customer.prototype = new Configurable();
Customer.prototype.constructor = Customer;

function readCookie(name) {
    return docCookies.getItem(name);
}

function Customer() {
    this.defaultEmail = 'info@wind101.net';
    this.defaultPassword = 'passwd';
    this.email = null;
    this.apiKey = null;
    /** REFACTOR to different constructor 
    this.forms = {
        'SettingsFormUnits': SettingsFormUnits,
        'SettingsFormGraphics': SettingsFormGraphics,
    };*/
    this.forms = {};
    this.timezones = null;

    // if null that user isn't logged, otherwise logged in
    this.sessionId = null;

    this.container = null;
    this.socket = new SocketHandler(SERVER_SOCKET_ADDRESS);
};

Customer.prototype.init = function(){
    var uuid = readCookie('session_id');
    if(uuid !== null && uuid !== 'null' && uuid !== ''){
        console.log('[Customer] TO DO: Logging in from cookies...(' + uuid + ')');
        var data = { c:4, language:1, name:'John Doe', u:uuid };
        
        this.onLoginDone(data);
        //this.login(this.defaultEmail, '');
    } else {
        this.login(this.defaultEmail, this.defaultPassword);
    }
};

Customer.prototype.getSocket = function() {
    return this.socket;
};

Customer.prototype.getEmail = function() {
    return this.email ? this.email : this.defaultEmail;
};

Customer.prototype._initTimeZones = function() {
    if (this.timezones === null) {
        var timezoneRequest = new MessageTimezonesRequest(this.sessionId);

        timezoneRequest.done = jQuery.proxy(function(data, textStatus, jqXHR) {
            if (data.c == 5) {
                console.warn('[Container] Load Time Zones failed');
                return;
            }
            console.debug("[Container] Load Time Zones");
            this.timezones = data.ai;
        }, this);
        timezoneRequest.request();
    }
};

Customer.prototype.isDefaultEmail = function() {
    return this.getEmail() === this.defaultEmail;
};

// this is same in device.js for DEVICE SETTINGS, refactor!
Customer.prototype.showModal = function(defaultForm) {
    //TODO: sensor_modal.html can be loaded dynamically (if not yet present!, cache it)
    // we must tell bootstrap how big is the modal div
    // (when empty, it will not show up)
    var $modal = jQuery('#global-settings');

    for (var i in this.forms) {
        var form = new this.forms[i]($modal, i);
        form.init();

        if (i === defaultForm) {

            jQuery('.modal').on('show.bs.modal', function(e) {
                jQuery('#' + defaultForm).focus();
                form.render();
            });
            $modal.modal('show');
        }
    }
};

Customer.prototype.notifyModalStart = function(saveButton, keepBound) {
    if (!saveButton)
        saveButton = 'Save';
    var $buttons = jQuery('#global-settings button.btn-wind101-save').text(saveButton).addClass('disabled grayscale');
    if (keepBound !== true)
        $buttons.unbind();
    jQuery('.modal-body').removeClass('ok_green');
    jQuery('.modal-footer div.text-left').text('');
    jQuery('.modal-footer').attr('id', 'animated_bckg_modal');
};

Customer.prototype.notifyModalOk = function() {
    jQuery('#global-settings button.btn-wind101-save').removeClass('disabled grayscale');
    jQuery('.modal-body').addClass('ok_green');
    jQuery('.modal-footer').attr('id', '');
};


Customer.prototype.getUnitId = function(type) {
    return this.getSettings().units[type];
};

// Customer should not have its own settings so it's only in container and easily extendable
Customer.prototype.getSettings = function() {
    return this.container.settings;
};

Customer.prototype.getTimezoneOffset = function() {
    var jContinents = this.timezones;
    for (var c in jContinents) {
        for (var s in jContinents[c].ai) {
            var combined = jContinents[c].re + '/' + jContinents[c].ai[s].pl;
            if (combined === this.getSettings().timezone) {
                return jContinents[c].ai[s].of / 1000 / 60;
            }
        }
    }

    return 0;
};

Customer.prototype.login = function(email, password) {
    console.debug("[Customer] Logging in...");
    this.email = email;
    var msg = new MessageLoginRequest(email, password);
    msg.done = jQuery.proxy(this.onLoginDone, this);
    msg.fail = jQuery.proxy(this.onLoginFail, this);
    msg.request();
};

/*
 * check if it's correct / fail otherwise
 * open web-socket
 * call container.onlogin()
 */
Customer.prototype.onLoginDone = function(data) {
    console.debug("[Customer] Login successful");

    if (typeof data !== "object" || typeof data.c == "undefined") {
        throw "Invalid onLoginDone response";
    }

    this.alert('Connected to server', this.alerts.success, false);

    if (typeof data.u == "undefined" || 5 == data.c) {
        this.onLoginFail(null, data.err ? data.err : "Wrong password.");
        return;
    }
    else if (4 != data.c) { // anything else than 4
        this.onLoginFail(null, data.err ? data.err : "Failed! Unknown error.");
        return;
    }
    
    if (customer.email && customer.email != customer.defaultEmail) {
        this.alert('Logged in', this.alerts.success, false);
    }
    
    this.sessionId = data.u;
    
    // set cookies
    var date = new Date();
    date.setMonth(date.getMonth() + 1);
    docCookies.setItem('session_id', this.sessionId, date);

    // set customer name
    if (data.name) {
        this.customer_name = data.name;
    }

    // set language id
    if (data.language) {
        this.language_id = data.language;
    }

    // now we know we are logged in - init container
    this.initContainer();

    console.debug("[Customer] Login data: " + (typeof data === 'undefined' ? 'null' :  data.name));
};

Customer.prototype.onLoginFail = function(jqXHR, textStatus, errorThrown) {
    this.email = this.defaultEmail;
    
    // show custom message
    if (jqXHR === null) {
        this.alert(textStatus);
    } else if(textStatus === 'parsererror') {
        // bad login
        this.alert('<b>Wrong email or password</b>', this.alerts.warning, false);
    } else {
        // server is not available, try login after 6 seconds again
        this.alert('<b>Server not available</b><br>Waiting for start...', this.alerts.info, false);
        setTimeout(function() {
            customer.login(customer.getEmail(), this.defaultPassword);
        }, 6000);
    }
};

Customer.prototype.initContainer = function() {
    this.container = new Container('#container');
    this.container.onlogin();
}

Customer.prototype.logout = function() {
    this.sessionId = null;
    this.email = null;
    docCookies.removeItem('session_id');

    // send logout command to server
    // TODO ?
};
Customer.prototype.alerts = {
    info: 'info',
    warning: 'warning',
    success: 'success',
    danger: 'danger'
};

/**
 * @argument text msg text of message
 * @argument string type (null, 'info', 'error', 'success')
 */
Customer.prototype.alert = function(msg, type, allowDismiss, delay) {
    if (!type) {
        type = this.alerts.info;
    }
    
    if (typeof jQuery.bootstrapGrowl === 'undefined') {
        console.log('ALERT[' + type + '] ' + msg);
        return;
    }

    if (typeof allowDismiss === 'undefined') {
        allowDismiss = true;
    }
    
    if (typeof delay === 'undefined') {
        delay = 5000;
    }

    jQuery.bootstrapGrowl(msg, {
        ele: 'body', // which element to append to
        type: type, // (null = 'info', 'danger', 'success')
        offset: {from: 'top', amount: 60}, // 'top', or 'bottom'
        align: 'right', // ('left', 'right', or 'center')
        width: 250, // (integer, or 'auto')
        delay: delay, // Time while the message will be displayed. It's not equivalent to the *demo* timeOut!
        allow_dismiss: allowDismiss, // If true then will display a cross to close the popup.
        stackup_spacing: 9 // spacing between consecutively stacked growls.
    });
};

/*
 * dashboardChanged - default undefined
 * removeIndex - default undefined
 * serial - default undefined
 */
Customer.prototype.saveSettings = function(dashboardChanged, removeIndex, serial) {
    this.softSettings = null;
    var softSettings = removeIndex ? this.container.getSoftSettingsWithRemove(removeIndex) : this.container.getSoftSettings();
    this.extendSoftSettings(softSettings);
    var settings = this.getSoftSettings();
    if (this.container.activeDashboard >= settings.dashboards.length) {
        this.container.activeDashboard = settings.dashboards.length - 1;
    }
    
    console.debug("[Customer] Saving soft settings:");
    console.debug(settings);

    var index = this.container.activeDashboard;
    if (dashboardChanged && this.container.isControllerDevice()) {
        // find next available dashboardId
        var counter = 0;
        index = null;
        for (var i in settings.dashboards) {
            if (i != counter) {
                index = counter + 1;
                continue;
            }
            counter++;
        }
        if (index === null) {
            index = counter;
        }

        settings.dashboards[index] = settings.dashboards[0];
        settings.dashboards[index].name = 'Dashboard #' + index;
    }
    
    settings.dashboards[0] = {};
    
    var saveRequest = new MessageContainerSettingSetRequest(this.sessionId, settings);
    //this.applySettings();
    saveRequest.done = jQuery.proxy(
            function(data, textStatus, jqXHR) {
                console.debug("[Customer] Saving settings successful");
                this.notifyModalOk();
                this.alert('Settings saved', this.alerts.success, false);
                if (dashboardChanged) {
                    window.location.hash = serial ? '#device/' + serial : '#dashboard/' + index;
                    customer.initContainer();
                    
                // hack to pass dashboardChanged false but initContainer - when on device controller and deleting dashboard
                } else if (this.container.isControllerDevice()) {
                    customer.initContainer();
                }
            }, this
            );

    saveRequest.fail = jQuery.proxy(
            function(data, textStatus, jqXHR) {
                console.warn("[Customer] Saving settings failed");
                this.notifyModalOk();
                this.alert('Save failed', this.alerts.danger, false);
            }, this
            );

    saveRequest.request();
};

Customer.prototype.applySettings = function() {
    this.container.applySettings();
};

Customer.prototype.getDeviceProperties = function() {
    var device = this.container.getActiveDevice();
    var sensorId = this.container.getSensorId(device.s, 'PROPERTY');
    if (sensorId === undefined) {
        this.container.device.showInfo(null, device);
        return;
    }
    
    console.info('Serial ' + device.s + ': ' + sensorId);
    var msg = new MessageSensorDataRequest(this.sessionId, 0, sensorId, null, null, 'LAST');
    msg.fail = jQuery.proxy(function() {
            console.error('Failed: ' + serial);
            this.alert('Failed');
    }, this);
    
        msg.done = jQuery.proxy(function(data) {
            if (data && data.al === 1) {
                this.container.device.showProperties(JSON.parse(data.ai[0].value));
            }
            if (device.dtype === 'VIA_COLLECTOR') {
                // socket onmessage contains the callback
                this.getSocket().getHwInfo(device.s);
            } else {
                this.container.device.showInfo(null, device);
            }
        }, this);
    msg.request();
};


// this is downloaded code
// from where?

var docCookies = {
  getItem: function (sKey) {
    if (!sKey) { return null; }
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    if (!sKey) { return false; }
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};