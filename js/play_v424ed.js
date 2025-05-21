window.scrollTo(0, 0);

var prizeContent;
var winner;
var exchangeCode;

var noRepeteableRequest = function (fn) {
    var request;

    return function () {
        if (request && request.readyState !== 4) {
            return request;
        }
        request = fn.apply(null, arguments);
        return request;
    }
}

var CUSTOM_EVENTS = {
    PAGE_VIEW: 'pageView',
    LEAD_CONVERSION: 'leadConversion',
    PLAY_SUCCED: 'playSucced',
    LOGIN_LOADED: 'loginViewLoaded',
    PRE_NEXT_SCREEN: 'PRE_NEXT_SCREEN',
    POST_NEXT_SCREEN: 'POST_NEXT_SCREEN',
    PRE_SHOW_VIEWPORT: 'PRE_SHOW_VIEWPORT',
    POST_SHOW_VIEWPORT: 'POST_SHOW_VIEWPORT',
    REGISTER_FETCHED: 'REGISTER_FETCHED',
    SUBMIT_MIDDLEWARE_FAILED: 'SUBMIT_MIDDLEWARE_FAILED'
};

var Playmo = {
    Sso: {
        redirect: function () {
            location.replace('/login')
        }
    },
    Promo: {
        id: null,
        type: null,
        state: null,
        isLeadmo: function () { return this.type === 'leadmo'; },
        typeHasPacks: function () { return [ 'leadmo', 'play-code' ].indexOf(this.type) === -1; },
        isDemo: function () { return this.state === 'demo'; }
    },
    Display: {
        isNoPhoneMode: function () {
            return !Playmo.Device.isMobile && document.body.classList.contains('no-phone');
        }
    },
    Cookies: {
        prefix: 'pl-',
        set: function (name, value, days) {
            var d = new Date;
            d.setTime(d.getTime() + (24 * 60 * 60 * 1000 * days));
            document.cookie = this.prefix + name + '=' + value + ';path=/;expires=' + d.toGMTString();
        },
        get: function (name) {
            var v = document.cookie.match('(^|;) ?' + this.prefix + name + '=([^;]*)(;|$)');
            return v ? v[2] : null;
        },
        delete: function (name) {
            this.set(name, '', -1);
        }
    },
    Device: {
        isMobile: null
    },
    Url: {
        getExtraParams: function() {
            // var search = location.search.substring(1);
            // var queryParams = JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) { return key===""?value:decodeURIComponent(value) })

            Playmo.Form.extraData.query = Playmo.Url.getQueryParams()
            Playmo.Form.extraData.hash = window.location.hash

        },
        deleteQuery: function () {
            Playmo.Url.getExtraParams()
            window.history.replaceState({}, document.title, '/');
        },
        getQueryParams: function () {
            var query = location.search.substring(1);
            var queryString = {};

            if (!query) return queryString;

            var vars = query.split('&')
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split('=');
                var key = decodeURIComponent(pair[0]);
                var value = decodeURIComponent(pair[1]);

                if (typeof queryString[key] === 'undefined') {
                    queryString[key] = decodeURIComponent(value);
                } else if (typeof queryString[key] === 'string') {
                    queryString[key] = [queryString[key], decodeURIComponent(value)];
                } else {
                    queryString[key].push(decodeURIComponent(value));
                }
            }
            return queryString;
        },
        getUrlParameter: function (name) {
            name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
            var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
            var results = regex.exec(location.search);
            return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
        },
        register: function () {
            var playRegisterData = atob(Playmo.Url.getUrlParameter('pl-register'));
            if (!playRegisterData) return false;

            try {
                return JSON.parse(playRegisterData);
            } catch (e) {
                return false;
            }
        }
    },
    Ajax: {
        now: function () {
            return $.ajax('/now');
        },
        check: noRepeteableRequest(function (data) {
            var formData = getDataFromForm($('#form-login'));
            for (var key in data || {}) {
                formData.set(key, data[key]);
            }
            return $.ajax({
                url: '../play/check',
                method: 'POST',
                data: formData,
                dataType: 'json',
                contentType: false,
                processData: false
            });
        }),
        notify: noRepeteableRequest(function (leadId, emailId) {
            var formData = new FormData();
            formData.set('leadId', leadId);
            formData.set('emailId', emailId);

            return $.ajax({
                url: '../play/notification',
                method: 'POST',
                data: formData,
                dataType: 'json',
                contentType: false,
                processData: false
            });
        }),
        leads: noRepeteableRequest(function (key, value) {
            return $.ajax({
                url: '../play/leads?' + key + '=' + encodeURIComponent(value),
                method: 'GET',
                contentType: false,
                processData: false
            });
        }),
        times: noRepeteableRequest(function (data) {
            var formData = getDataFromForm($('#form-login'));
            for (var key in data) {
                formData.set(key, data[key]);
            }

            return $.ajax({
                url: '../play/times',
                method: 'POST',
                data: formData,
                dataType: 'json',
                contentType: false,
                processData: false
            });
        }),
        confirm: noRepeteableRequest(function (playId, winner, lang) {
            return $.ajax({
                url: '../confirm-play',
                method: 'POST',
                data: {
                    playId: playId,
                    winner: winner,
                    lang: lang
                },
                dataType: 'json'
            });
        }),
        main: noRepeteableRequest(function (options) {
            var defaultOptions = {
                url: '../play/main',
                method: 'POST',
                data: getDataFromForm($('#form-login')),
                dataType: 'json',
                contentType: false,
                processData: false
            };

            return $.ajax(Object.assign(defaultOptions, options || {}));
        }),
        sendOptional: noRepeteableRequest(function (options) {
            var values = Playmo.Promo.Fields
                .filter(field => field.optional)
                .reduce(
                    (carry, field) => {
                        if (field.data.multiple) {
                            var fieldValue = $(`input[name='${field.id}[]']:checked`).get().map(input => input.value).join(', ');
                            if (!fieldValue) return carry;
                            carry[field.id] = fieldValue;
                            return carry;
                        }
                        var $field = Playmo.field(field.id);

                        if (!$field || !($field.val())) return carry;

                        var fieldValue = $field.val().trim();

                        if (!fieldValue.length) return carry;

                        carry[field.id] = fieldValue;
                        return carry;
                    }, {}
                )
            values.lead_id = Playmo.play.playId;
            values.extraData = Playmo.Form.extraData

            var defaultOptions = {
                url: '../play/main',
                method: 'PUT',
                data: JSON.stringify(values),
                contentType: 'application/json'
            };

            return $.ajax(Object.assign(defaultOptions, options || {}));
        }),
        register: noRepeteableRequest(function (data) {
            return $.ajax({
                url: '../play/register',
                method: 'POST',
                data: data || getDataFromForm($('#form-register')),
                dataType: 'json',
                contentType: false,
                processData: false
            });
        }),
        getRegister: noRepeteableRequest(function (field, value, options) {
            var defaultOptions = {
                url: '../play/register?' + field + '=' + encodeURIComponent(value),
                method: 'GET',
                contentType: false,
                processData: false,
                success: function (register) {
                    var $form = $('#form-login'),
                        $registerIdInput = $form.find('[name="registerId"]');
                    if (!$registerIdInput.length) {
                        $form.append('<input id="inputRegisterId" type="hidden" name="registerId" value="'+register.id+'">');
                    }
                    Playmo.Events.trigger(CUSTOM_EVENTS.REGISTER_FETCHED, register);
                }
            };

            return $.ajax(Object.assign(defaultOptions, options || {}));
        }),
        getRegisterByEmail: noRepeteableRequest(function (email) {
            return Playmo.Ajax.getRegister('email', email, { suppressErrors: true });
        }),
        getRegisterByValidationCode: noRepeteableRequest(function (code) {
            return Playmo.Ajax.getRegister('validationCode', code, { suppressErrors: true });
        }),
        getRegisterByRestrictiveField: noRepeteableRequest(function (value) {
            return Playmo.Ajax.getRegister('restrictive', value, { suppressErrors: true });
        })
    },
    Sections: {
        options: {
            animationIn: 'slideInUp',
            animationOut: 'slideOutUp',
            animationDelayIn: 500,
            animationDelayOut: null,
            animationDurationIn: null,
            animationDurationOut: null
        },
        goTo: function (section, options, callback) {
            var parent = $('section.js-section.active');
            var target = $(`${section}.js-section`);
            var options = Object.assign({}, this.options, options || {});

            window.scrollTo(0, 0);

            triggerEvent(CUSTOM_EVENTS.PAGE_VIEW, `#{section}`)

            if (options.animationDelayOut) parent.css({'animation-delay': options.animationDelayOut + 'ms'});
            if (options.animationDurationOut) parent.css({'animation-duration': options.animationDurationOut + 'ms'});
            parent.addClass(`animated ${options.animationOut}`);

            target.one('animationend', () => { target.removeClass(`animated ${options.animationIn}`); });
            setTimeout(() => {
                parent.removeClass(`active animated ${options.animationOut}`).addClass('hidden')

                callback && callback();

                if (options.animationDurationOut) target.css({'animation-duration': options.animationDurationIn + 'ms'});
                target
                    .removeClass('hidden')
                    .addClass(`active animated ${options.animationIn}`);
            }, options.animationDelayIn);
        }
    },
    Legal: {
        Popup: {
            selectors: {
                modal: '#pl-legal-popup-modal',
                globalCheckbox: '#pl-legal-popup-global',
                callToAction: '#pl-legal-popup-submit'
            }
        }
    },
    Events: {
        PRE_NEXT_SCREEN: 'PRE_NEXT_SCREEN',
        POST_NEXT_SCREEN: 'POST_NEXT_SCREEN',

        on: function (name, handler) {
            document.addEventListener(name, handler);
        },
        trigger: function (name, data) {
            var event;
            if (window.CustomEvent) {
                event = new CustomEvent(name, { detail: data });
            } else {
                event = document.createEvent('CustomEvent');
                event.initCustomEvent(name, true, true, data);
            }

            document.dispatchEvent(event);
        }
    },
    Utils: {
        msToTime: function (duration) {
            var milliseconds = parseInt((duration % 1000) / 10, 10),
                seconds = parseInt((duration / 1000) % 60, 10);

            seconds = (seconds < 10) ? '0' + seconds : seconds;
            milliseconds = (milliseconds < 10) ? '0' + milliseconds : milliseconds;

            return  seconds + ":" + milliseconds;
        },
        selectorToClass: function (selector) { return selector.substring(1); },
        classToSelector: function (cssClass) { return '.' + cssClass; },
        Timeout: {
            create: function (delay) {
                var timeout, startTime, remainingTime = delay;
                var onFinishHandlers = [];
                var isRunning = false;

                function start () {
                    resume();
                    return this;
                }

                function resume () {
                    startTime = Date.now();
                    clearTimeout(timeout);
                    timeout = setTimeout(onEndTimeout, remainingTime);
                    isRunning = true;
                    return this;
                }

                function pause () {
                    clearTimeout(timeout);
                    remainingTime -= Date.now() - startTime;
                    isRunning = false;
                    return this;
                }

                function onFinish (handler) {
                    onFinishHandlers.push(handler);
                    return this;
                }

                function onEndTimeout () {
                    isRunning = false;
                    remainingTime = 0;
                    onFinishHandlers.forEach(function (handler) {
                        handler();
                    });
                }

                function getRemainingTime () {
                    return isRunning
                        ? remainingTime - (Date.now() - startTime)
                        : remainingTime;
                }

                return {
                    start: start,
                    pause: pause,
                    resume: resume,
                    getRemainingTime: getRemainingTime,
                    onFinish: onFinish
                }
            }
        },
        Timer: {
            create: function ($element, options) {
                if ($element instanceof jQuery) {
                    if (!$element.length) throw new Error('Playmo Timer: $element is mandatory');
                    $element = $element.get(0);
                } else {
                    if (!($element instanceof HTMLElement)) throw new Error('Playmo Timer: $element is mandatory');
                }

                var defaultOptions = {
                    maxTime: 0,
                    step: 20,
                    reverse: false,
                    format: 'ss:SS',
                };
                options = Object.assign(defaultOptions, options || {});

                var onStartHandlers = [],
                    onPauseHandlers = [],
                    onResumeHandlers = [],
                    onFinishHandlers = [];

                var timeout = Playmo.Utils.Timeout.create(options.maxTime);
                var renderInterval;

                function trigger (handlers) {
                    handlers.forEach(function (handler) {
                        setTimeout(handler, 0);
                    });
                }

                function render () {
                    var remainingTime = timeout.getRemainingTime();

                    var toRender = options.reverse
                        ? remainingTime
                        : options.maxTime - remainingTime;
                    var value = moment(toRender).format(options.format);
                    $element.innerHTML = value;
                }

                function startRenderInterval() {
                    renderInterval = setInterval(render, options.step);
                }

                function stopRenderInterval () {
                    clearInterval(renderInterval);
                }

                function onFinishTimeout () {
                    stopRenderInterval();
                    render();
                    trigger(onFinishHandlers);
                }

                function start () {
                    startTime = Date.now();
                    timeout.onFinish(onFinishTimeout);
                    timeout.start();
                    startRenderInterval();
                    trigger(onStartHandlers);
                    return this;
                }

                function pause () {
                    timeout.pause();
                    stopRenderInterval();
                    trigger(onPauseHandlers);
                    return this;
                }

                function resume () {
                    timeout.resume();
                    startRenderInterval();
                    trigger(onResumeHandlers);
                    return this;
                }

                function remaining () {
                    var remaining = timeout.getRemainingTime();

                    return remaining > 0 ? remaining : 0;
                }

                return {
                    start: start,
                    pause: pause,
                    resume: resume,
                    remaining: remaining,
                    onStart: function (handler) {
                        onStartHandlers.push(handler);
                        return this;
                    },
                    onPause: function (handler) {
                        onPauseHandlers.push(handler);
                        return this;
                    },
                    onResume: function (handler) {
                        onResumeHandlers.push(handler);
                        return this;
                    },
                    onFinish: function (handler) {
                        onFinishHandlers.push(handler);
                        return this;
                    }
                };
            }
        },
        Stepper: {
            pointSelector: '.pl-point',
            pointStateClasses: {
                active: 'pl-point__active',
                resolved: 'pl-point__resolved',
                miss: 'pl-point__miss',
                success: 'pl-point__success',
            },
            separatorSelector: '.pl-separator',
            separatorStateClasses: {
                active: 'pl-separator__active',
                resolved: 'pl-separator__resolved',
                miss: 'pl-separator__miss',
                success: 'pl-separator__success',
            },
            create: function ($element, options) {
                if ($element instanceof jQuery) {
                    if (!$element.length) throw new Error('Playmo Stepper: $element is mandatory');
                    $element = $element.get(0);
                } else {
                    if (!($element instanceof HTMLElement)) throw new Error('Playmo Stepper: $element is mandatory');
                }

                var defaultOptions = {
                    steps: 5,
                    autoStart: true,
                };
                options = Object.assign(defaultOptions, options || {});

                var onStartHandlers = [],
                    onMoveHandlers = [],
                    onActiveHandlers = [],
                    onResolveHandlers = [],
                    onFinishHandlers = [];

                var started = false,
                    finished = false,
                    currentStep = 0;

                var pointStateClasses = Playmo.Utils.Stepper.pointStateClasses,
                    separatorStateClasses = Playmo.Utils.Stepper.separatorStateClasses,
                    pointSelector = Playmo.Utils.Stepper.pointSelector,
                    separatorSelector = Playmo.Utils.Stepper.separatorSelector;

                function init () {
                    var markUp = '<div class="pl-stepper">';

                    for (var i = 0; i < options.steps - 1; i++) {
                        markUp += '<div class="pl-point"><div class="pl-point--content"></div></div>';
                        markUp += '<div class="pl-separator"><div class="pl-separator--content"></div></div>';
                    }

                    markUp += '<div class="pl-point"><div class="pl-point--content"></div></div>';
                    markUp += '</div>';

                    $element.innerHTML = markUp;
                }

                function start () {
                    if (started) return;
                    started = true;

                    onStartHandlers.forEach(function (handler) { handler(); });

                    activeCurrentStep();
                }

                function activeCurrentStep () {
                    var $pointToActive = currentPoint();
                    setPointState($pointToActive, [ pointStateClasses.active ]);

                    var $separatorToActive = currentSeparator();
                    if ($separatorToActive) {
                        setSeparatorState($separatorToActive, [ separatorStateClasses.active ]);
                    }

                    onActiveHandlers.forEach(function (handler) { handler({ point: $pointToActive, separator: $separatorToActive }); });
                }

                function setPointState ($point, newStateClasses) {
                    setElementState($point, pointStateClasses, newStateClasses);
                }

                function setSeparatorState ($separator, newStateClasses) {
                    setElementState($separator, separatorStateClasses, newStateClasses);
                }

                function setElementState ($el, stateClasses, newStateClasses) {
                    $el.classList.remove(Object.values(stateClasses));
                    $el.classList.add(...newStateClasses);
                }

                function resolveCurrentStep (success) {
                    var $pointToResolve = currentPoint();
                    var pointNewStateClasses = [ pointStateClasses.resolved , success ? pointStateClasses.success : pointStateClasses.miss ];
                    setPointState($pointToResolve, pointNewStateClasses);

                    var $separatorToResolve = currentSeparator();
                    if ($separatorToResolve) {
                        var separatorNewStateClasses = [ separatorStateClasses.resolved , success ? separatorStateClasses.success : separatorStateClasses.miss ];
                        setSeparatorState($separatorToResolve, separatorNewStateClasses);
                    }

                    onResolveHandlers.forEach(function (handler) { handler({ point: $pointToResolve, separator: $separatorToResolve, success: !!success }); });
                }

                function next (success) {
                    if (!started) return;
                    if (finished) return;

                    resolveCurrentStep(success);

                    currentStep++;
                    if (currentStep === options.steps) {
                        end();
                        return;
                    }

                    onMoveHandlers.forEach(function (handler) { handler(); });

                    activeCurrentStep();
                }

                function currentPoint () {
                    return $element.querySelectorAll(pointSelector)[currentStep];
                }

                function currentSeparator () {
                    return $element.querySelectorAll(separatorSelector)[currentStep];
                }

                function end () {
                    finished = true;
                    onFinishHandlers.forEach(function (handler) { handler(); });
                }

                function onStart (handler) { onStartHandlers.push(handler); return this; }

                function onMove (handler) { onMoveHandlers.push(handler); return this; }

                function onFinish (handler) { onFinishHandlers.push(handler); return this; }

                function onActive (handler) { onActiveHandlers.push(handler); return this; }

                function onResolve (handler) { onResolveHandlers.push(handler); return this; }

                init();
                if (options.autoStart) { start(); }

                return {
                    start: start,
                    next: next,
                    onStart: onStart,
                    onMove: onMove,
                    onActive: onActive,
                    onResolve: onResolve,
                    onFinish: onFinish
                }
            }
        }
    },
    Games: {
        FortuneWheel: {
            selectors: {
                wrapper: '.pl-fortune-wheel-wrapper',
                arrow: '.pl-fortune-wheel-arrow',
                wheel: '.pl-fortune-wheel-wheel'
            },
            helperClasses: {
                showShadow: 'pl-if-shadow',
                wheelRounded: 'pl-if-rounded'
            },
            create: function ($elem, config, options) {
                if ($elem instanceof jQuery) {
                    if (!$elem.length) throw new Error('Playmo FortuneWheel: $elem is mandatory');
                    $elem = $elem.get(0);
                } else {
                    if (!($elem instanceof HTMLElement)) throw new Error('Playmo FortuneWheel: $elem is mandatory');
                }

                if (!Object.keys(config || {}).length) throw new Error('Playmo FortuneWheel: config is mandatory');
                if (!Object.keys(config.default || {}).length) throw new Error('Playmo FortuneWheel: default config is mandatory');

                var prize = Playmo.prize;
                if (!prize) throw new Error('Playmo FortuneWheel: prize is mandatory');

                var pack = Playmo.pack;
                var packId = pack && pack.id;

                var defaultOptions = {
                    showShadow: true,
                    stopOnPrize: false,
                    wheelRounded: true,
                    startOnClick: true,
                    turns: 5
                };

                var defaultConfig = {
                    arrowImage: '../images/fortuneWheel/arrow.png',
                    totalPieces: 8,
                    pieces: []
                }

                options = Object.assign(defaultOptions, options || {});
                config = Object.assign(defaultConfig, config.default, config[packId] || {});

                if (config.totalPieces % 2 !== 0 || config.totalPieces < 2 || config.totalPieces > 14) throw new Error('Playmo FortuneWheel: pieces should be even and between 2 and 14');

                var totalPieces = config.totalPieces;

                var helperClasses = Playmo.Games.FortuneWheel.helperClasses,
                    selectors = Playmo.Games.FortuneWheel.selectors,
                    toClass = Playmo.Utils.selectorToClass;

                var onStartHandlers = [],
                    onFinishHandlers = [];

                function createFortuneWheel () {
                    $elem.innerHTML = '<div class="' + toClass(selectors.wrapper) + '">' +
                        '<div class="' + toClass(selectors.arrow) + '"></div>' +
                        '<div class="' + toClass(selectors.wheel) + '"></div>' +
                        '</div>';

                    var arrow = document.querySelector(selectors.arrow);
                    var wheel = document.querySelector(selectors.wheel);

                    var wheelImage = config.wheelImage || '../images/fortuneWheel/wheel_' + totalPieces + '.png';
                    var arrowImage = config.arrowImage;

                    options.showShadow && wheel.classList.add(helperClasses.showShadow)
                    options.wheelRounded && wheel.classList.add(helperClasses.wheelRounded)
                    if (options.startOnClick) {
                        wheel.addEventListener('mousedown', start);
                        wheel.addEventListener('touchstart', start);
                    }

                    Promise.all([
                        loadBackgroundImage(arrow, arrowImage),
                        loadBackgroundImage(wheel, wheelImage)
                    ])
                        .then(function () {
                            $(document).trigger('content:loaded');
                        })
                        .catch(function (error) {
                            throw new Error('Playmo FortuneWheel: There was a problem loading images')
                        })
                }

                $(document).on('content:init', createFortuneWheel);

                function loadBackgroundImage (element, url) {

                    return new Promise(function(resolve, reject) {
                        var image  = new Image();
                        image.src = url;

                        image.onload = function() {
                            resolve(url);
                        };
                        image.onerror = function() {
                            reject(url);
                        };

                        // Inject into document to kick off loading
                        element.style.backgroundImage = 'url(\'' + url + '\')';
                    });
                }

                function start () {
                    var wrapper = document.querySelector(selectors.wrapper)
                    var wheel = document.querySelector(selectors.wheel);

                    wheel.removeEventListener('mousedown', start);
                    wheel.removeEventListener('touchstart', start);

                    onStartHandlers.forEach(function (handler) { handler(); });

                    var finalDeg = calculateDeg();

                    wheel.style.transform = 'rotate(' + finalDeg + 'deg)';
                    wrapper.classList.add('rotate-fastest')
                    setTimeout(function () {
                        wrapper.classList.remove('rotate-fastest');
                        wrapper.classList.add('rotate-faster');
                    }, 1120)
                    setTimeout(function () {
                        wrapper.classList.remove('rotate-faster');
                        wrapper.classList.add('rotate-slow');
                    }, 2020)
                    setTimeout(function () {
                        wrapper.classList.remove('rotate-slow');
                    }, 2820)

                    setTimeout(function () {
                        onFinishHandlers.forEach(function (handler) { handler(); });
                    }, 3200);
                }

                function calculateDeg () {
                    var turns = 360 * options.turns;
                    var angle = 360 / totalPieces;
                    var offsetDeg = 5;

                    var piece = options.stopOnPrize ? getPrizePiece() : getRandomPiece()
                    var startDeg = 360 + offsetDeg - (piece * angle)
                    var finalDeg = 360 - offsetDeg - ((piece - 1) * angle)

                    console.log(angle, turns, piece, startDeg, finalDeg)

                    return Math.floor(Math.random() * (finalDeg - startDeg + 1) + startDeg) + turns
                }

                function getPrizePiece () {
                    var choices = [];
                    var key = options.keyAlias ? 'name' : 'id';

                    config.pieces.forEach(function(haystack, index) {
                        haystack.find(function (item) { return (item === prize.id || item === prize.name) }) && choices.push(index + 1)
                    });

                    return choices[Math.floor(Math.random() * choices.length)];

                }

                function getRandomPiece () {
                    var choices = []

                    for (var i = 1; i < totalPieces + 1; i++) {
                        winner && i % 2 === 0 && choices.push(i) // Even pieces
                        !winner && i % 2 !== 0 && choices.push(i) // Odd pieces
                    }

                    return choices[Math.floor(Math.random() * choices.length)]
                }

                return {
                    render: createFortuneWheel,
                    start: start,
                    onStart: function (handler) {
                        onStartHandlers.push(handler);
                        return this;
                    },
                    onFinish: function (handler) {
                        onFinishHandlers.push(handler);
                        return this;
                    }
                }
            }
        },
        Jackpot: {
            selectors: {
                wrapper: '.pl-jackpot-wrapper',
                lever: '.pl-jackpot-lever',
                content: '.pl-jackpot-content',
                columnLeft: '.pl-jackpot-col-left',
                columnCenter: '.pl-jackpot-col-center',
                columnRight: '.pl-jackpot-col-right'
            },
            helperClasses: {
                showShadow: 'pl-if-shadow'
            },
            create: function ($elem, config, options) {
                if ($elem instanceof jQuery) {
                    if (!$elem.length) throw new Error('Playmo Jackpot: $elem is mandatory');
                    $elem = $elem.get(0);
                } else {
                    if (!($elem instanceof HTMLElement)) throw new Error('Playmo Jackpot: $elem is mandatory');
                }

                if (!Object.keys(config || {}).length) throw new Error('Playmo Jackpot: config is mandatory');
                if (!Object.keys(config.default || {}).length) throw new Error('Playmo Jackpot: default config is mandatory');

                var prize = Playmo.prize;
                if (!prize) throw new Error('Playmo Jackpot: prize is mandatory');

                var pack = Playmo.pack;
                var packId = pack && pack.id;

                var defaultOptions = {
                    showShadow: true,
                    startOnClick: true
                };

                var defaultConfig = {
                    colorWrapper: '#DEDEDE',
                    colorBorderWrapper: '#DEDEDE',
                    columnLeftImage: '../images/jackpot/default_column.png',
                    columnCenterImage: '../images/jackpot/default_column.png',
                    columnRightImage: '../images/jackpot/default_column.png',
                    leverImage: '../images/jackpot/lever.png'
                }

                var jackpotOn = false;

                var helperClasses = Playmo.Games.Jackpot.helperClasses,
                    selectors = Playmo.Games.Jackpot.selectors,
                    toClass = Playmo.Utils.selectorToClass;

                var onStartHandlers = [],
                    onFinishHandlers = [];

                function createJackpot () {
                    config = Object.assign(defaultConfig, config.default, config[packId] || {});
                    options = Object.assign(defaultOptions, options || {});

                    $elem.innerHTML = '<div class="' + toClass(selectors.wrapper) + '">' +
                        '<div class="' + toClass(selectors.lever) + '"></div>' +
                        '<div class="' + toClass(selectors.content) + '">' +
                        '<div class="pl-jackpot-col ' + toClass(selectors.columnLeft) + '"></div>' +
                        '<div class="pl-jackpot-col ' + toClass(selectors.columnCenter) + '"></div>' +
                        '<div class="pl-jackpot-col ' + toClass(selectors.columnRight) + '"></div>' +
                        '</div>' +
                        '</div>';

                    var lever = document.querySelector(selectors.lever);
                    var columnLeft = document.querySelector(selectors.columnLeft);
                    var columnCenter = document.querySelector(selectors.columnCenter);
                    var columnRight = document.querySelector(selectors.columnRight);
                    var wrapper = document.querySelector(selectors.wrapper);

                    var leverImage = config.leverImage;
                    var columnLeftImage = config.columnLeftImage;
                    var columnCenterImage = config.columnCenterImage;
                    var columnRightImage = config.columnRightImage;

                    wrapper.style.background = config.colorWrapper;
                    wrapper.style.borderColor = config.colorBorderWrapper;

                    options.showShadow && wrapper.classList.add(helperClasses.showShadow)
                    if (options.startOnClick) {
                        lever.addEventListener('mousedown', start);
                        lever.addEventListener('touchstart', start);
                    }

                    Promise.all([
                        loadBackgroundImage(lever, leverImage),
                        loadBackgroundImage(columnLeft, columnLeftImage),
                        loadBackgroundImage(columnCenter, columnCenterImage),
                        loadBackgroundImage(columnRight, columnRightImage)
                    ])
                        .then(function () {
                            $(document).trigger('content:loaded');
                        })
                        .catch(function (error) {
                            throw new Error('Playmo Jackpot: There was a problem loading images')
                        })
                }

                $(document).on('content:init', createJackpot);

                function loadBackgroundImage (element, url) {

                    return new Promise(function(resolve, reject) {
                        var image  = new Image();
                        image.src = url;

                        image.onload = function() {
                            resolve(url);
                        };
                        image.onerror = function() {
                            reject(url);
                        };

                        // Inject into document to kick off loading
                        element.style.backgroundImage = 'url(\'' + url + '\')';
                    });
                }

                function start () {
                    var lever = document.querySelector(selectors.lever);
                    var columnLeft = document.querySelector(selectors.columnLeft);
                    var columnCenter = document.querySelector(selectors.columnCenter);
                    var columnRight = document.querySelector(selectors.columnRight);

                    lever.removeEventListener('mousedown', start);
                    lever.removeEventListener('touchstart', start);

                    onStartHandlers.forEach(function (handler) { handler(); });

                    if (!jackpotOn) {
                        jackpotOn = true;

                        lever.classList.add('down');

                        columnLeft.className += " ready";
                        columnCenter.className += " ready";
                        columnRight.className += " ready";

                        var columnsPositions = getColumnsPositions()

                        // if (!winner) {
                        //     while (columnLeftPosition == 4253 && columnLeftPosition == columnCenterPosition && columnCenterPosition == columnRightPosition) {
                        //         columnsPositions = getColumnsPositions();
                        //     }
                        // }

                        columnLeft.style.backgroundPosition = '0 ' + columnsPositions.left + 'px';
                        columnCenter.style.backgroundPosition = '0 ' + columnsPositions.center + 'px';
                        columnRight.style.backgroundPosition = '0 ' + columnsPositions.right + 'px';

                        setTimeout(function () {
                            lever.classList.remove('down');
                        }, 250);
                    }

                    setTimeout(function () {
                        onFinishHandlers.forEach(function (handler) { handler(); });
                    }, 5000);
                }

                function getColumnsPositions() {
                    var arrWin = [53, 263, 473, 683];
                    var arrLos = [53, 123, 193, 333];

                    var vueltas = 210 * 20;

                    var positions = !!winner ? arrWin : arrLos;

                    return {
                        left: positions[Math.floor(Math.random() * 3)] + vueltas,
                        center: positions[Math.floor(Math.random() * 3)] + vueltas,
                        right: positions[Math.floor(Math.random() * 3)] + vueltas
                    }
                }

                return {
                    render: createJackpot,
                    start: start,
                    onStart: function (handler) {
                        onStartHandlers.push(handler);
                        return this;
                    },
                    onFinish: function (handler) {
                        onFinishHandlers.push(handler);
                        return this;
                    }
                }
            }
        },
        Quiz: {
            selectors: {
                question: '.pl-quiz__question',
                answers: '.pl-quiz__answer',
                timer: '.pl-quiz__timer',
                quizTimer: '.pl-quiz__quiz-timer',
                answerSelected: '.pl-quiz__answer--selected',
                answerSuccess: '.pl-quiz__answer--success',
                answerFail: '.pl-quiz__answer--fail',
                timerCheese: '.pl-quiz__cheese-timer',
                quizTimerCheese: '.pl-quiz__cheese-quiz-timer',
                questionNumber: '.pl-quiz__question-number'
            },
            create: function ($elem, questions, options) {
                if (!$elem.length) throw new Error('PlaymoQuiz: $elem is mandatory');
                if (!questions.length) throw new Error('PlaymoQuiz: questions is mandatory');
                if (options.animationDuration) {
                    if (options.animationDurationIn || options.animationDurationOut) throw new Error('PlaymoQuiz: animationDuration is bad configured');
                    options.animationDurationIn = options.animationDurationOut = options.animationDuration;
                }
                if (options.animationDelay) {
                    if (options.animationDelayIn || options.animationDelayOut) throw new Error('PlaymoQuiz: animationDelay is bad configured');
                    options.animationDelayIn = options.animationDelayOut = options.animationDelay;
                }
                questions.forEach(function (question) {
                    if (!question.question) throw new Error('PlaymoQuiz: question.question is mandatory ['+JSON.stringify(question)+']');
                    if (!question.answers || !question.answers.length) throw new Error('PlaymoQuiz: question.answers is mandatory ['+JSON.stringify(question)+']');
                    if (!question.solution) throw new Error('PlaymoQuiz: question.solution is mandatory ['+JSON.stringify(question)+']');
                    var answersIds = question.answers.map(function (answer) { return answer.id; });
                    if (typeof question.solution !== 'object') question.solution = [ question.solution ]
                    for (var i = 0; i < question.solution.length; i++) {
                        if (answersIds.indexOf(question.solution[i]) === -1) throw new Error('PlaymoQuiz: question.solution not found in answers ['+JSON.stringify(question)+']');
                    }
                });
                if (options.hitsToEnd > 0) {
                    if (options.hitsToEnd >= options.totalToShow) throw new Error('PlaymoQuiz: hitsToEnd must be lower than totalToShow');
                    if (options.hitsToEnd >= questions.length) throw new Error('PlaymoQuiz: hitsToEnd must be lower than questions count');
                }

                var defaultOptions = {
                    totalToShow: questions.length,
                    random: false,
                    maxQuestionTime: 0,
                    maxQuizTime: 0,
                    animationDurationIn: 250,
                    animationDurationOut: 250,
                    timerStep: 20,
                    timerReverse: false,
                    timerFormat: 'ss:SS',
                    quizTimerFormat: 'ss:SS',
                    sort: false,
                    animationIn: 'fadeIn',
                    animationOut: 'fadeOut',
                    animationWrapper: $elem,
                    animationDelayIn: 250,
                    animationDelayOut: 250,
                    hitsToEnd: 0,
                    questionTimerMode: 'digital',
                    quizTimerMode: 'digital'
                };

                options = Object.assign(defaultOptions, options || {});

                if (options.length < options.totalToShow) throw new Error('PlaymoQuiz: Insufficient questions');

                var selectors = Playmo.Games.Quiz.selectors;

                var onPreShowHandlers = [],
                    onShowHandlers = [],
                    onAnswerHandlers = [],
                    onFinishHandlers = [],
                    questionsToShow = [];

                if (options.random) {
                    for (var i = 0; i < options.totalToShow; i++) {
                        var index = Math.floor(Math.random() * questions.length);
                        questionsToShow.push(questions[index]);
                        questions.splice(index, 1);
                    }
                } else {
                    questionsToShow = questions;
                }

                if (options.sort) {
                    var sortFunction = typeof options.sort === 'function'
                        ? options.sort
                        : function (a, b) {
                            var aSortAtr = a[options.sort];
                            var bSortAttr = b[options.sort];

                            if (aSortAtr < bSortAttr) return -1;
                            if (aSortAtr > bSortAttr) return 1;
                            return 0;
                        };
                    questionsToShow.sort(sortFunction);
                }

                var currentQuestionIndex = 0,
                    currentQuestion = questionsToShow[currentQuestionIndex],
                    gameTimeout,
                    questionTimeout,
                    questionStartTime,
                    questionTime,
                    quizTotalTime = 0,
                    timerInterval,
                    currentHits = 0;

                var $animationWrapper = $elem.find(options.animationWrapper),
                    $question = $elem.find(selectors.question),
                    $answers = $elem.find(selectors.answers),
                    $timer = $elem.find(selectors.timer),
                    $quizTimer = $elem.find(selectors.quizTimer),
                    hasTimer = !!$timer.length || !!$quizTimer;

                if (!$animationWrapper.length) {
                    $animationWrapper = $elem;
                }

                if (!options.maxQuestionTime) {
                    $timer.hide();
                    $(selectors.timerCheese).hide();
                }

                $animationWrapper.addClass('animated');

                $(selectors.questionNumber).html(`<span>0</span>/${options.totalToShow}`);

                function triggerInAnimation (callback) {
                    triggerAnimation(
                        options.animationDelayIn,
                        options.animationDurationIn,
                        options.animationOut,
                        options.animationIn,
                        callback
                    );
                }

                function triggerOutAnimation (callback) {
                    triggerAnimation(
                        options.animationDelayOut,
                        options.animationDurationOut,
                        options.animationIn,
                        options.animationOut,
                        callback
                    );
                }

                function triggerAnimation (delay, duration, oldAnimation, newAnimation, callback) {
                    $elem.one('animationend', options.animationWrapper, callback);
                    $animationWrapper
                        .css({
                            'animation-delay': delay + 'ms',
                            'animation-duration': duration + 'ms'
                        })
                        .removeClass(oldAnimation)
                        .addClass(newAnimation);
                }

                function start () {
                    $answers.attr('disabled', true);
                    if (options.maxQuizTime) {
                        gameTimeout = Playmo.Utils.Timeout.create(options.maxQuizTime);
                        gameTimeout.onFinish(quizTimeReached);
                    }
                    showQuestion();
                }

                function addAnswersListener () {
                    $answers.on('click', function () { endQuestion($(this)); });
                }

                function removeAnswersListener () {
                    $answers.off('click');
                }

                function showQuestion () {
                    var questionNumber = currentQuestionIndex + 1;

                    onPreShowHandlers.forEach(function (handler) {
                        handler({ question: currentQuestion, questionNumber: questionNumber });
                    });

                    $elem.add($animationWrapper).show();

                    $question.html(currentQuestion.question);
                    $(`${selectors.questionNumber} span`).text(questionNumber);
                    $answers
                        .removeClass([ Playmo.Utils.selectorToClass(selectors.answerSuccess), Playmo.Utils.selectorToClass(selectors.answerFail), Playmo.Utils.selectorToClass(selectors.answerSelected) ].join(' '))
                        .each(function (index, elem) {
                            var answer = currentQuestion.answers[index];
                            if (!answer) {
                                $(elem).hide();
                                return;
                            }
                            $(elem)
                                .html(answer.content)
                                .data('id', answer.id)
                                .show();
                        });
                    resetTimer();

                    var onAnimationEnd = function () {
                        questionStartTime = Date.now();
                        questionTime = 0;

                        if (options.maxQuestionTime) {
                            questionTimeout = setTimeout(endQuestion, options.maxQuestionTime);
                        }

                        if (hasTimer) {
                            timerInterval = setInterval(updateTimer, options.timerStep);
                        }

                        if (gameTimeout) {
                            gameTimeout.resume();
                        }

                        $answers.removeAttr('disabled');
                        addAnswersListener();

                        onShowHandlers.forEach(function (handler) {
                            handler({ question: currentQuestion, questionNumber: currentQuestionIndex + 1  });
                        });
                    };

                    triggerInAnimation(onAnimationEnd);
                }

                function nextQuestion () {
                    questionTimeout && clearTimeout(questionTimeout);
                    currentQuestionIndex++;
                    if (currentQuestionIndex >= options.totalToShow) {
                        endGame();
                        return;
                    }

                    currentQuestion = questionsToShow[currentQuestionIndex];
                    showQuestion();
                }

                function endQuestion ($answer) {
                    questionTimeout && clearTimeout(questionTimeout);
                    removeAnswersListener();

                    var response = $answer && $answer.data('id'),
                        success = $answer && currentQuestion.solution.indexOf(response) !== -1 || false,
                        time = Date.now() - questionStartTime;

                    if (hasTimer && timerInterval) {
                        clearInterval(timerInterval);
                        // updateTimer();
                    }

                    if (gameTimeout) {
                        gameTimeout.pause();
                    }

                    quizTotalTime += time;

                    $answers
                        .attr('disabled', true)
                        .each(function (index, elem) {
                            var $elem = $(elem),
                                isSelected = $elem.data('id') === response,
                                cssClass = currentQuestion.solution.indexOf($elem.data('id')) !== -1
                                    ? selectors.answerSuccess
                                    : selectors.answerFail;

                            if (isSelected) $elem.addClass(Playmo.Utils.selectorToClass(selectors.answerSelected));
                            $elem.addClass(Playmo.Utils.selectorToClass(cssClass));
                        });

                    onAnswerHandlers.forEach(function (handler) {
                        handler({ question: currentQuestion, success: success, response: response, time: time });
                    });

                    if (success) {
                        currentHits++;
                        if (currentHits === options.hitsToEnd) {
                            quizTimeReached();
                            return;
                        }
                    }

                    triggerOutAnimation(nextQuestion);
                }

                function endGame () {
                    onFinishHandlers.forEach(function (handler) {
                        handler({ time: quizTotalTime, totalSuccess: currentHits });
                    });
                }

                function quizTimeReached () {
                    if (hasTimer && timerInterval) {
                        clearInterval(timerInterval);
                        updateTimer();
                    }
                    $answers.attr('disabled', true);
                    triggerOutAnimation(endGame);
                }

                function updateTimer () {
                    var offset = Date.now() - questionStartTime;

                    var questionTime = offset;
                    var questionOffset = options.timerReverse && options.maxQuestionTime
                        ? options.maxQuestionTime - questionTime
                        : questionTime;
                    var questionValue = moment(questionOffset).format(options.timerFormat);

                    if (options.questionTimerMode === 'digital') {
                        $timer.html(questionValue);
                    } else if (options.questionTimerMode === 'cheese') {
                        var progress = (questionTime / options.maxQuestionTime) * 100;

                        $(selectors.timerCheese + ' circle').css({'stroke-dasharray': progress + ' 100' });

                        // if(progress >= 100){
                        //     progressElement.setAttribute('style','');
                        // }
                    }

                    var quizTime = quizTotalTime + offset;
                    var quizOffset = options.timerReverse && options.maxQuizTime
                        ? options.maxQuizTime - quizTime
                        : quizTime;
                    var quizValue = moment(quizOffset).format(options.quizTimerFormat);


                    if (options.quizTimerMode === 'digital') {
                        $quizTimer.html(quizValue);
                    } else if (options.quizTimerMode === 'cheese') {
                        var quizProgress = (quizTime / options.maxQuizTime) * 100;

                        $(selectors.quizTimerCheese + ' circle').css({'stroke-dasharray': quizProgress + ' 100' });

                        // if(progress >= 100){
                        //     progressElement.setAttribute('style','');
                        // }
                    }
                }

                function resetTimer () {
                    var time = options.timerReverse && options.maxQuestionTime
                        ? options.maxQuestionTime
                        : 0;

                    if (options.questionTimerMode === 'digital') {
                        var value = Playmo.Utils.msToTime(time);
                        $timer.html(value.substr(0, options.timerFormat.length));
                    } else if (options.questionTimerMode === 'cheese') {
                        $(selectors.timerCheese + ' circle').css({'stroke-dasharray': '0 100' });

                        // if(progress >= 100){
                        //     progressElement.setAttribute('style','');
                        // }
                    }
                }

                function stop () {
                    timerInterval && clearInterval(timerInterval);
                    questionTimeout && clearTimeout(questionTimeout);
                    gameTimeout && gameTimeout.pause();
                }

                return {
                    start: start,
                    stop: stop,
                    onPreShow: function (handler) {
                        onPreShowHandlers.push(handler);
                        return this;
                    },
                    onShow: function (handler) {
                        onShowHandlers.push(handler);
                        return this;
                    },
                    onAnswer: function (handler) {
                        onAnswerHandlers.push(handler);
                        return this;
                    },
                    onFinish: function (handler) {
                        onFinishHandlers.push(handler);
                        return this;
                    }
                };
            }
        },
        ScratchCard: {
            defaultConfig: {
                canvasImage: null,
                coinImage: null,
                height: 290,
                width: 290
            },
            defaultOptions: {
                endAt: 30,
                withCoin: false
            },
            selectors: {
                wrapper: '.pl-scratch-card-wrapper',
                coin: '.pl-scratch-card-coin',
                canvas: '.pl-scratch-card-canvas',
                image: '.pl-scratch-card-image'
            },
            create: function ($elem, config, options) {
                if ($elem instanceof jQuery) {
                    if (!$elem.length) throw new Error('Playmo ScratchCard: $elem is mandatory');
                    $elem = $elem.get(0);
                } else {
                    if (!($elem instanceof HTMLElement)) throw new Error('Playmo ScratchCard: $elem is mandatory');
                }

                if (!Object.keys(config || {}).length) throw new Error('Playmo ScratchCard: config is mandatory');
                if (!Playmo.prize) throw new Error('Playmo ScratchCard: prize is mandatory');

                var canvas = null;
                var canvasContext = null;
                var coin = null;

                var isMouseDown = false;
                var lastPoint = { x: 0, y: 0 };
                var touch = false;
                var update = 0;

                var canvasImage = new Image();
                var coinImage = new Image();
                var prizeImage = new Image();
                var brush = new Image();
                // Set image for invisble brush
                brush.src = '/images/brushes/brush2.png';

                var transparentAtStart,
                    stride      = 5,
                    alphaOffset = 20;

                options = Object.assign(Playmo.Games.ScratchCard.defaultOptions, options || {});
                config = Object.assign(Playmo.Games.ScratchCard.defaultConfig, config || {});

                options.withCoin = options.withCoin && config.coinImage

                var selectors = Playmo.Games.ScratchCard.selectors,
                    toClass = Playmo.Utils.selectorToClass;

                var onFinishHandlers = [];

                function createScratchCard () {
                    $elem.innerHTML = '<div class="' + toClass(selectors.wrapper) + '">' +
                        '<canvas class="' + toClass(selectors.canvas) + '"></canvas>' +
                        (options.withCoin ? '<div class="' + toClass(selectors.coin) + '"></div>' : '') +
                        '<img class="' + toClass(selectors.image) + '" src="">' +
                        '</div>';

                    var wrapper = document.querySelector(selectors.wrapper)

                    wrapper.style.setProperty('height', config.height + 'px');
                    wrapper.style.setProperty('width', config.width + 'px');

                    Promise.all([
                        setCanvas(),
                        setPrize(),
                        setCoin()
                    ])
                        .then(function () {
                            $(document).trigger('content:loaded');
                            $(selectors.image).attr('src', Playmo.prize.image)
                        })
                        .catch(function (error) {
                            throw new Error('Playmo ScratchCard: There was a problem loading images')
                        })
                }

                function addEventsToCanvas () {
                    document.body.addEventListener('touchstart', function() { touch = true; }, false);

                    canvas.addEventListener('mousedown', scratchOff); // allow to draw a dot if there is a click but no mouse move
                    canvas.addEventListener('mousemove', scratchOff);
                    document.addEventListener('mouseup', mouseOff); // stop scratching off even if the mouse is out of the canvas

                    // smartphone events
                    canvas.addEventListener('touchstart', scratchOff);
                    canvas.addEventListener('touchmove', scratchOff);
                    document.addEventListener('touchend', mouseOff);

                    // Cursor events (move and display/hide the cursor)
                    canvas.addEventListener('mouseover', mouseEnter);
                    canvas.addEventListener('mouseout', mouseExit);
                    canvas.addEventListener('mousemove', mouseMove);
                    canvas.addEventListener('touchstart', mouseEnter);
                    canvas.addEventListener('touchend', mouseExit);
                    canvas.addEventListener('touchmove', mouseMove);

                    document.addEventListener('touchstart', cursorFix);
                    document.addEventListener('touchmove', cursorFix);
                    document.addEventListener('touchend', cursorFix);
                }

                function setCanvas () {
                    return new Promise(function (resolve, reject) {
                        canvas = document.querySelector(selectors.canvas);
                        canvasContext = canvas.getContext('2d', { willReadFrequently: true });
                        canvasContext.translate(0, 0);

                        canvas.height = config.height;
                        canvas.width = config.width;

                        addEventsToCanvas();

                        if (config.canvasImage) {
                            canvasImage.crossOrigin = 'anonymous';
                            canvasImage.src = config.canvasImage + '?v=' + Date.now();

                            canvasImage.onload = function () {
                                canvasContext.drawImage(canvasImage, 0, 0, config.width, config.height);
                                transparentAtStart = getTransparentPixels()
                                resolve();
                            };

                            canvasImage.onerror = function() {
                                reject();
                            };
                        } else {
                            canvasContext.fillStyle = "blue";
                            canvasContext.fill();
                            resolve();
                        }
                    });
                }

                function setPrize () {

                    return new Promise(function (resolve, reject) {
                        prizeImage.src = Playmo.prize.image;

                        var prizeHeight = prizeImage.height;
                        var prizeWidth = prizeImage.width;

                        if (prizeHeight > prizeWidth && prizeHeight > config.height) {
                            prizeImage.height = config.height;
                            prizeImage.width = (config.height * prizeWidth) / prizeHeight;
                        } else if (prizeWidth > prizeHeight && prizeWidth > config.width) {
                            prizeImage.width = config.width;
                            prizeImage.height = (config.width * prizeHeight) / prizeWidth;
                        }

                        prizeImage.onload = function () {
                            resolve();
                        };

                        prizeImage.onerror = function() {
                            reject();
                        };
                    });
                }

                function setCoin () {
                    return new Promise(function (resolve, reject) {
                        if (!options.withCoin) {
                            resolve();
                        } else {

                            coin = document.querySelector(selectors.coin);
                            coinImage.src = config.coinImage;

                            // Si hay un icono, que no se vea el cursor.
                            canvas.style.setProperty('cursor', 'none');

                            coinImage.onload = function () {
                                var coinWidth = coinImage.width;
                                var coinHeight = coinImage.height;

                                if (coinHeight > coinWidth && coinHeight > 70) {
                                    coinHeight = 70;
                                    coinWidth = (70 * coinWidth) / coinHeight;
                                } else if (coinWidth > coinHeight && coinWidth > 70) {
                                    coinHeight = 70;
                                    coinWidth = (70 * coinHeight) / coinWidth;
                                } else if (coinWidth == coinHeight && coinWidth > 70) {
                                    coinHeight = 70;
                                    coinWidth = 70;
                                }

                                coin.height = coinHeight;
                                coin.width = coinWidth;

                                coin.style.width = coinWidth + 'px';
                                coin.style.height = coinHeight + 'px';
                                coin.style.background = 'url("' + config.coinImage + '") no-repeat left top';
                                coin.style.backgroundSize = '100%';

                                setCursorCssProperties();
                                resolve();
                            }

                            coinImage.onerror = function () {
                                reject();
                            };
                        }
                    });
                }

                function scratchOff(event) {
                    // this variable is used as a parameter for the scratchPercent function
                    // it allows to update the discovered percents for each click
                    var click = false;

                    var eventX = (event.touches && event.touches[0].pageX) || event.pageX;
                    var eventY = (event.touches && event.touches[0].pageY) || event.pageY;

                    var x = eventX - this.offsetLeft;
                    var y = eventY - this.offsetTop;

                    var p = getPosition(document.querySelector(selectors.wrapper));

                    if(event.type == 'touchmove') {
                        event.preventDefault();
                        click = false;
                    } else if(event.type == 'mousedown' || event.type == 'touchstart') {
                        isMouseDown = true;
                        click = true;

                        lastPoint = { x: (eventX - p.x), y: (eventY - p.y) }
                    }

                    if (isMouseDown) {

                        x = (eventX - p.x);
                        y = (eventY - p.y);

                        canvasContext.globalCompositeOperation = 'destination-out';

                        var currentPoint = { x: x, y: y };
                        var dist = distanceBetween(lastPoint, currentPoint);
                        var angle = angleBetween(lastPoint, currentPoint);

                        for (var i = 0; i < dist; i++) {
                            x = lastPoint.x + (Math.sin(angle) * i) - 25;
                            y = lastPoint.y + (Math.cos(angle) * i) - 25;
                            canvasContext.drawImage(brush, x, y);
                        }

                        lastPoint = currentPoint;

                        // Fix for a bug on some android phone where globalCompositeOperation prevents canvas to update
                        if(event.type == 'touchmove' || event.type == 'touchstart' || event.type == 'touchend') {
                            canvas.style.marginRight = '1px';
                            canvas.style.marginRight = '0px';
                        }

                        // If scratch off percents exceed limit, the end event will be triggered
                        if(parseInt(scratchPercent(click)) >= options.endAt) {
                            clear(true);
                        }
                    }
                }

                function setCursorCssProperties() {
                    var wrapper = document.querySelector(selectors.wrapper);

                    wrapper.style.setProperty('cursor ', 'none');

                    coin.style.position = 'absolute';
                    coin.style.display = 'none';
                    coin.style.zIndex = '9000';
                    coin.style.top = 0;
                    coin.style.left = 0;
                    coin.style.pointerEvents = "none";

                    disableSelection(coin);
                }

                function distanceBetween(point1, point2) {
                    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
                }

                function angleBetween(point1, point2) {
                    return Math.atan2( point2.x - point1.x, point2.y - point1.y );
                }

                function getPosition(element) {

                    var xPosition = 0;
                    var yPosition = 0;

                    while(element) {
                        xPosition += (element.offsetLeft  + element.clientLeft);
                        yPosition += (element.offsetTop  + element.clientTop);
                        element = element.offsetParent;
                    }

                    return { x: xPosition, y: yPosition };
                }

                function mouseOff() {
                    isMouseDown = false;
                }

                function mouseEnter(event) {
                    var p = getPosition(document.querySelector(selectors.wrapper));
                    var pos_x = (event.touches && event.touches[0].pageX) || event.pageX;
                    var pos_y = (event.touches && event.touches[0].pageY) || event.pageY;

                    if (!options.withCoin) return;

                    coin.style.left = ((pos_x)  - p.x - (coin.width/2))+'px';
                    coin.style.top = ((pos_y)  - p.y - (coin.height/2))+'px';
                    coin.style.display = 'block';
                }

                function mouseExit() {
                    if (!options.withCoin) return;

                    coin.style.display = 'none';
                }

                function mouseMove(event) {
                    var p = getPosition(document.querySelector(selectors.wrapper));
                    var pos_x = (event.touches && event.touches[0].pageX) || event.pageX;
                    var pos_y = (event.touches && event.touches[0].pageY) || event.pageY;

                    if (!options.withCoin) return;

                    coin.style.left = ((pos_x)  - p.x - (coin.width/2))+'px';
                    coin.style.top = ((pos_y)  - p.y - (coin.height/2))+'px';
                }

                function disableSelection(target) {
                    // Make the target not selectable
                    target.style.setProperty('-khtml-user-select', 'none', 'important');
                    target.style.setProperty('-webkit-user-select', 'none', 'important');
                    target.style.setProperty('-moz-user-select', '-moz-none', 'important');
                    target.style.setProperty('-ms-user-select', 'none', 'important');
                    target.style.setProperty('user-select', 'none', 'important');
                    target.style.setProperty('-webkit-touch-callout', 'none', 'important');
                    target.style.setProperty('-ms-touch-action', 'none', 'important')
                }

                function cursorFix() {
                    canvas.style.setProperty('cursor', 'default', 'important');
                    document.removeEventListener('touchstart', cursorFix);
                    document.removeEventListener('touchmove', cursorFix);
                    document.removeEventListener('touchend', cursorFix);
                }
                
                function getTransparentPixels () {
                    var pixels  = canvasContext.getImageData(0, 0, config.width, config.height),
                        pdata   = pixels.data,
                        l       = pdata.length,
                        count   = 0;
                    
                    // pdata its an one dimension array with 4 values for pixel
                    // [ R1, G1, B1, A1, R2, G2, ... ]
                    // walk over alpha values
                    for (var i = 3; i < l; i += stride * 4) {
                        if (Number(pdata[i]) < alphaOffset) {
                           count++ ;
                        }
                    }  

                    return count;
                }

                function scratchPercent(click) {
                    var covered = 0;
                    var limit = 10;

                    // divise by 10 the number of time percent are calculated to avoid stressing the cpu on smartphones
                    if (update++ % limit == 0 || click) {
                        var alphaPixels = getTransparentPixels(),
                            totalPixels = config.width * config.height,
                            checkedPixels = totalPixels / stride,
                            userAlphaPixels = Math.max(alphaPixels - transparentAtStart, 1)
                            erasablePixels = Math.max(checkedPixels - transparentAtStart, 1);
                        
                        covered = Math.round((userAlphaPixels / erasablePixels) * 100);
                    }
                    return covered;
                }

                function clear() {
                    canvas.removeEventListener('mousedown', scratchOff);
                    canvas.removeEventListener('mousemove', scratchOff);
                    document.removeEventListener('mouseup', mouseOff);

                    // smartphone events
                    canvas.removeEventListener('touchstart', scratchOff);
                    canvas.removeEventListener('touchmove', scratchOff);
                    document.removeEventListener('touchend', mouseOff);

                    // Cursor events (move and display/hide the cursor)
                    canvas.removeEventListener('mouseover', mouseEnter);
                    canvas.removeEventListener('mouseout', mouseExit);
                    canvas.removeEventListener('mousemove', mouseMove);
                    canvas.removeEventListener('touchstart', mouseEnter);
                    canvas.removeEventListener('touchend', mouseExit);
                    canvas.removeEventListener('touchmove', mouseMove);

                    canvas.style.opacity = 0;

                    setTimeout(function () {
                        var wrapper = document.querySelector(selectors.wrapper);

                        wrapper.removeChild(canvas);
                        options.withCoin && wrapper.removeChild(coin);

                        // To unselect all selected while scratch...
                        document.getSelection().removeAllRanges();
                    }, 200);

                    onFinishHandlers.forEach(function (handler) { handler(); });
                }

                $(document).on('content:init', createScratchCard);

                return {
                    onFinish: function (handler) {
                        onFinishHandlers.push(handler);
                        return this;
                    },
                    render: createScratchCard
                }
            }
        },
        Stripe: {
            selectors: {
                wrapper: '.pl-roulette-wrapper',
                row: '.pl-roulette-row',
                item: '.pl-roulette-item',
                winner: '.pl-roulette-item-winner'
            },
            create: function ($elem, items, options) {
                if ($elem instanceof jQuery) {
                    if (!$elem.length) throw new Error('PlaymoStripe: $elem is mandatory');
                    $elem = $elem.get(0);
                } else {
                    if (!($elem instanceof HTMLElement)) throw new Error('PlaymoStripe: $elem is mandatory');
                }

                if (!Object.keys(items || {}).length) throw new Error('PlaymoStripe: items is mandatory');
                if (!items.noPrize) throw new Error('PlaymoStripe: noPrize item is mandatory');

                var prize = Playmo.prize;
                if (!prize) throw new Error('PlaymoStripe: prize is mandatory');

                var pack = Playmo.pack;
                var packId = pack && pack.id;

                var promotionTypeHasPacks = Playmo.Promo.typeHasPacks();
                if (promotionTypeHasPacks) {
                    if (!prize.no_prize && !items[packId]) throw new Error('PlaymoStripe: prize.pack_id item is mandatory');
                } else {
                    if (!items.leadmo) throw new Error('PlaymoStripe: leadmo item is mandatory');
                }
                // TODO: check all items
                // TODO: options.totalItems should be even

                var ITEM_MARGIN_HORIZONTAL = 10;

                var defaultOptions = {
                    totalItems: 80,
                    size: 'n',
                    mode: 'linear',
                    transitionDuration: 4,
                    transitionTimingFunction: 'ease',
                    animationDurationIn: 250,
                    animationDurationOut: 250,
                    animationIn: 'fadeIn',
                    animationOut: 'fadeOut',
                    animationDelayIn: 250,
                    animationDelayOut: 250
                };
                options = Object.assign(defaultOptions, options || {});

                var selectors = Playmo.Games.Stripe.selectors,
                    toClass = Playmo.Utils.selectorToClass;

                var onStartHandlers = [],
                    onFinishHandlers = [];

                var $wrapper, $row, $firstItem, $items;
                var winnerItem;
                var itemWinnerIndex = options.totalItems / 2;

                function getPackItems () {
                    if (!promotionTypeHasPacks) return items.leadmo;
                    if (prize.no_prize) return [];

                    return items[packId];
                }

                function getItemsToDraw (prizeItems) {
                    var result = [];
                    var frequency = [];

                    prizeItems.forEach(
                        function (item, index) {
                            var itemFrequency = item.frequency || 1;

                            for (var i = 0; i < itemFrequency; i++) {
                                frequency.push(index)
                            }
                        }
                    );

                    winnerItem = prizeItems.find(
                        function (item) {
                            return item.prizesId.indexOf(prize.id) !== -1;
                        }
                    );


                    var rnd;
                    for (var i = 0; i < options.totalItems / 2; i++) {
                        rnd = Math.floor(Math.random() * frequency.length);
                        result.push(prizeItems[frequency[rnd]])
                    }

                    result.push(winnerItem);

                    for (var i = 0; i < options.totalItems / 2; i++) {
                        rnd = Math.floor(Math.random() * frequency.length);
                        result.push(prizeItems[frequency[rnd]]);
                    }

                    return result
                }

                function createStripe () {
                    var packItems = getPackItems();
                    var prizeItems = packItems.concat(items.noPrize);

                    var baseMarkUp = '' +
                        (
                            Playmo.Display.isNoPhoneMode()
                                ? '<div class="pl-prize-roulette pl-prize-roulette-fullscreen">'
                                : '<div class="pl-prize-roulette pl-prize-roulette--'+options.mode+'">'
                        ) +
                        '<div class="pl-roulette">' +
                        '<div class="pl-roulette-bg"></div>' +
                        '<div class="pl-roulette-pointer"></div>' +

                        '<div class="pl-roulette-wrapper"></div>' +
                        '</div>' +
                        '</div>'
                    ;
                    $elem.innerHTML = baseMarkUp;

                    var itemsToDraw = getItemsToDraw(prizeItems);

                    $row = document.createElement('div');
                    $row.classList.add(toClass(selectors.row), 'animated');

                    var $itemBase = document.createElement('div');
                    $itemBase.classList.add(toClass(selectors.item));

                    // var $itemImageBase = document.createElement('div');
                    // $itemImageBase.classList.add(toClass(selectors.itemImage));

                    var $item, $itemImage;
                    itemsToDraw.forEach(
                        function (item) {
                            $item = $itemBase.cloneNode();
                            $item.style.backgroundImage = 'url(' + item.imageSrc + ')';
                            // $itemImage = $itemImageBase.cloneNode();
                            // $itemImage.src = item.imageSrc;
                            //
                            // $item.appendChild($itemImage);
                            $row.innerHTML += $item.outerHTML;
                        }
                    );

                    $wrapper = $elem.querySelector(selectors.wrapper);
                    $wrapper.appendChild($row);

                    $firstItem = $elem.querySelector(selectors.item);
                    $items = $elem.querySelectorAll(selectors.item);

                    if (options.mode === 'linear') {
                        var wrapperWidth = $wrapper.offsetWidth,
                            itemWidth = $firstItem.offsetWidth + ITEM_MARGIN_HORIZONTAL * 2,
                            itemsInWrapper = Math.ceil(wrapperWidth / itemWidth),
                            itemToCenterIndex = Math.floor(itemsInWrapper / 2) + 1,
                            $itemToCenter = $elem.querySelectorAll(selectors.item)[itemToCenterIndex - 1];

                        var leftOffset = ((itemToCenterIndex - 1) * itemWidth) + (itemWidth / 2) - $wrapper.offsetWidth / 2;

                        $row.style.left = (-1 * leftOffset) + 'px';
                        $row.style.transition = 'left ' + options.transitionDuration + 's ' + options.transitionTimingFunction;
                    } else if (options.mode === 'single') {

                    }

                    $(document).trigger('content:loaded');
                }

                $(document).on('content:init', createStripe);

                var currentItem = 0;
                function singleStart () {
                    hideCurrentItem(nextItem);
                }

                function hideCurrentItem () {
                    triggerOutAnimation(nextItem);
                }

                function nextItem () {
                    $items[currentItem].style.display = 'none';
                    currentItem++;
                    $items[currentItem].style.display = 'block';
                    triggerInAnimation(checkNextItem)
                }

                function checkNextItem () {
                    if (currentItem === itemWinnerIndex) {
                        markWinner();
                        onFinishHandlers.forEach(function (handler) { handler({ item: winnerItem }); });
                        // showPrizeContent();
                        return;
                    }
                    hideCurrentItem();
                }

                function markWinner () {
                    $items[itemWinnerIndex].classList.add(toClass(selectors.winner));
                }

                function triggerInAnimation (callback) {
                    triggerAnimation(
                        options.animationDelayIn,
                        options.animationDurationIn,
                        options.animationOut,
                        options.animationIn,
                        callback
                    );
                }

                function triggerOutAnimation (callback) {
                    triggerAnimation(
                        options.animationDelayOut,
                        options.animationDurationOut,
                        options.animationIn,
                        options.animationOut,
                        callback
                    );
                }

                function triggerAnimation (delay, duration, oldAnimation, newAnimation, callback) {
                    $($row).one('animationend', callback);
                    $($row)
                        .css({
                            'animation-delay': delay + 'ms',
                            'animation-duration': duration + 'ms'
                        })
                        .removeClass(oldAnimation)
                        .addClass(newAnimation);
                }

                function start () {
                    onStartHandlers.forEach(function (handler) { handler(); });

                    if (options.mode === 'linear') {
                        var itemWidth = $firstItem.offsetWidth + ITEM_MARGIN_HORIZONTAL * 2;

                        var leftOffset = (itemWinnerIndex * itemWidth) + (itemWidth / 2) - $wrapper.offsetWidth / 2;
                        $row.style.left = (-1 * leftOffset) + 'px';
                        markWinner();
                        setTimeout(
                            function () {
                                // TODO: POJO or Event ??
                                onFinishHandlers.forEach(function (handler) { handler({ item: winnerItem }); });
                                // showPrizeContent();
                            },
                            options.transitionDuration * 1000
                        );
                    } else if (options.mode === 'single') {
                        singleStart();
                    }
                }

                return {
                    render: createStripe,
                    start: start,
                    onStart: function (handler) {
                        onStartHandlers.push(handler);
                        return this;
                    },
                    onFinish: function (handler) {
                        onFinishHandlers.push(handler);
                        return this;
                    }
                }
            }
        },
        AlphabetGame: {
            selectors: {
                wrapper: '.pl-alphabetgame',
                donut: '.pl-alphabetgame__donut',
                donutItem: '.pl-alphabetgame__donut-item',
                quizWrapper: '.pl-alphabetgame__question',
                questionTitle: '.pl-alphabetgame__title',
                donutItemSelected: '.pl-alphabetgame__donut-item-selected',
                donutItemSuccess: '.pl-alphabetgame__donut-item-success',
                donutItemFail: '.pl-alphabetgame__donut-item-fail',
                answers: '.pl-alphabetgame__answers'
            },
            create: function ($elem, questions, options) {
                if (!$elem.length) throw new Error('PlaymoAlphabetGame: $elem is mandatory');
                if (!questions.length) throw new Error('PlaymoAlphabetGame: questions is mandatory');
                if (questions.length > 25) throw new Error('PlaymoAlphabetGame: questions must be lower than 25');
                if (options.animationDuration) {
                    if (options.animationDurationIn || options.animationDurationOut) throw new Error('PlaymoAlphabetGame: animationDuration is bad configured');
                }
                if (options.animationDelay) {
                    if (options.animationDelayIn || options.animationDelayOut) throw new Error('PlaymoAlphabetGame: animationDelay is bad configured');
                }

                var questionsIds = [];

                questions.forEach(function (question) {
                    var questionId = question.id;

                    if (!question.question) throw new Error('PlaymoAlphabetGame: question.question is mandatory [' + JSON.stringify(question) + ']');
                    if (!question.answers || !question.answers.length) throw new Error('PlaymoAlphabetGame: question.answers is mandatory [' + JSON.stringify(question) + ']');
                    if (!question.solution) throw new Error('PlaymoAlphabetGame: question.solution is mandatory [' + JSON.stringify(question) + ']');
                    if (!question.title) throw new Error('PlaymoAlphabetGame: question.title is mandatory [' + JSON.stringify(question) + ']');
                    if (!questionId) throw new Error('PlaymoAlphabetGame: question.id is mandatory [' + JSON.stringify(question) + ']');
                    if (!questionId.toLowerCase().match(/[a-z]*/)) throw new Error('PlaymoAlphabetGame: question.id should be [a-z] [' + JSON.stringify(question) + ']');
                    if (questionsIds.indexOf(questionId) !== -1) throw new Error('PlaymoAlphabetGame: question.id should be unique [' + JSON.stringify(question) + ']');

                    questionsIds.push(questionId);

                    var answersIds = question.answers.map(function (answer) {
                        return answer.id;
                    });
                    if (typeof question.solution !== 'object') question.solution = [question.solution]
                    for (var i = 0; i < question.solution.length; i++) {
                        if (answersIds.indexOf(question.solution[i]) === -1) throw new Error('PlaymoAlphabetGame: question.solution not found in answers [' + JSON.stringify(question) + ']');
                    }
                });

                if (options.hitsToEnd > 0) {
                    if (options.hitsToEnd >= options.totalToShow) throw new Error('PlaymoAlphabetGame: hitsToEnd must be lower than totalToShow');
                    if (options.hitsToEnd >= questions.length) throw new Error('PlaymoAlphabetGame: hitsToEnd must be lower than questions count');
                }

                var selectors = Playmo.Games.AlphabetGame.selectors;

                var defaultOptions = {
                    totalToShow: questions.length,
                    timerReverse: true,
                    timerFormat: 'ss',
                    sort: 'id',
                    animationWrapper: $(selectors.quizWrapper)
                };

                options = Object.assign(defaultOptions, options || {});

                if (questions.length < options.totalToShow) throw new Error('PlaymoAlphabetGame: Insufficient questions');

                var quiz = Playmo.Games.Quiz.create($(selectors.wrapper), questions, options);

                quiz
                    .onPreShow(function (event) {
                        var question = event.question;

                        $(selectors.questionTitle).html(question.title);
                        $(`${selectors.donutItem}-${question.id.toLowerCase()} span`).addClass('bounceIn');
                        $(`${selectors.donutItem}-${question.id.toLowerCase()}`).addClass(`${Playmo.Utils.selectorToClass(selectors.donutItemSelected)}`);
                        $(selectors.answers).removeClass('bounceIn shake');
                    })
                    .onAnswer(function (event) {
                        var question = event.question,
                            stateClass = event.success
                                ? Playmo.Utils.selectorToClass(selectors.donutItemSuccess)
                                : Playmo.Utils.selectorToClass(selectors.donutItemFail);

                        $(selectors.answers).addClass(`animated ${event.success ? 'bounceIn' : 'shake'}`);
                        $(`${selectors.donutItem}-${question.id.toLowerCase()} span`).removeClass('bounceIn');
                        $(`${selectors.donutItem}-${question.id.toLowerCase()}`).toggleClass(`${Playmo.Utils.selectorToClass(selectors.donutItemSelected)} ${stateClass}`);
                    });

                return quiz;
            }
        },
        GhostWord: {
            selectors: {
                wrapper: '.pl-ghost-word',
                wrapperImage: '.pl-ghost-word__img',
                wrapperQuestion: '.pl-ghost__question',
                question: '.pl-ghost-word__question-question',
                markedWord: '.pl-ghost-word__marked-word'
            },
            create: function ($elem, questions, options) {
                if (!$elem.length) throw new Error('PlaymoGhostWord: $elem is mandatory');
                if (!questions.length) throw new Error('PlaymoGhostWord: questions is mandatory');
                if (questions.length > 25) throw new Error('PlaymoGhostWord: questions must be lower than 25');
                if (options.animationDuration) {
                    if (options.animationDurationIn || options.animationDurationOut) throw new Error('PlaymoGhostWord: animationDuration is bad configured');
                }
                if (options.animationDelay) {
                    if (options.animationDelayIn || options.animationDelayOut) throw new Error('PlaymoGhostWord: animationDelay is bad configured');
                }

                questions.forEach(function (question) {
                    var questionId = question.id;

                    if (!question.question) throw new Error('PlaymoGhostWord: question.question is mandatory [' + JSON.stringify(question) + ']');
                    if (!question.answers || !question.answers.length) throw new Error('PlaymoGhostWord: question.answers is mandatory [' + JSON.stringify(question) + ']');
                    if (!question.solution) throw new Error('PlaymoGhostWord: question.solution is mandatory [' + JSON.stringify(question) + ']');
                    if (!questionId) throw new Error('PlaymoGhostWord: question.id is mandatory [' + JSON.stringify(question) + ']');

                    var answersIds = question.answers.map(function (answer) {
                        return answer.id;
                    });
                    if (typeof question.solution !== 'object') question.solution = [question.solution]
                    for (var i = 0; i < question.solution.length; i++) {
                        if (answersIds.indexOf(question.solution[i]) === -1) throw new Error('PlaymoGhostWord: question.solution not found in answers [' + JSON.stringify(question) + ']');
                    }
                });

                if (options.hitsToEnd > 0) {
                    if (options.hitsToEnd >= options.totalToShow) throw new Error('PlaymoGhostWord: hitsToEnd must be lower than totalToShow');
                    if (options.hitsToEnd >= questions.length) throw new Error('PlaymoGhostWord: hitsToEnd must be lower than questions count');
                }

                var selectors = Playmo.Games.GhostWord.selectors;

                var defaultOptions = {
                    totalToShow: questions.length,
                    animationWrapper: $(selectors.wrapperQuestion),
                    questionTimerMode: 'cheese',
                    animationIn: 'fadeInUp',
                    animationOut: 'fadeOutDownBig',
                    animationDurationIn: 750,
                    animationDurationOut: 2000,
                    animationDelayIn: 0,
                    animationDelayOut: 500,
                };

                options = Object.assign(defaultOptions, options || {});

                if (questions.length < options.totalToShow) throw new Error('PlaymoGhostWord: Insufficient questions');

                var quiz = Playmo.Games.Quiz.create($(selectors.wrapper), questions, options);

                quiz
                    .onPreShow(function (event) {
                        var question = event.question;

                        $(selectors.wrapperImage).css("background-image", `url('${question.img}')`);
                        $(selectors.wrapperImage).removeClass('hidden fadeOutUp');
                        $(selectors.wrapperImage).addClass('fadeInDown');

                        $(selectors.question).html(question.question.replace('**', `<span class="pl-ghost-word__marked-word pl-ghost-word__marked-word-empty animated"></span>`));
                    })
                    .onAnswer(function (event) {
                        var question = event.question;

                        $(selectors.wrapperImage).removeClass('fadeInDown');
                        $(selectors.wrapperImage).addClass('fadeOutUp');

                        $(selectors.markedWord)
                            .text(question.answers.find(answer => answer.id === question.solution[0]).content)
                            .removeClass('pl-ghost-word__marked-word-empty')
                            .addClass(event.success ? 'pl-ghost-word__marked-word-success bounceIn' : 'pl-ghost-word__marked-word-error shake');
                    });

                return quiz;
            }
        },
        FindTheIcon: {
            selectors: {
                wrapper: '.pl-fti__wrapper',
                iconContainer: '.pl-fti__icon-container',
                icon: '.pl-fti__icon',
                iconPicked: '.pl-fti__icon-picked',
                iconFound: '.pl-fti__icon-found',
                timer: '.pl-fti__timer'
            },
            create: function ($elem, config) {

                if ($elem instanceof jQuery) {
                    if (!$elem.length) throw new Error('Playmo Find The Icon: $elem is mandatory');
                    $elem = $elem.get(0);
                } else {
                    if (!($elem instanceof HTMLElement)) throw new Error('Playmo Find The Icon: $elem is mandatory');
                }

                if (!Object.keys(config || {}).length) throw new Error('Playmo Find The Icon: config is mandatory');

                var defaultConfig = {
                    iconsToShow: 0,
                    sameIcon: null,
                    differentIcon: null,
                    maxTime: 0,
                    totalRounds: 0,
                    totalPicksRound: 0,
                    timerFormat: 'ss:SS',
                    timerReverse: false,
                    timerStep: 20,
                }

                var timer, round = 0, picks = 0, arrRandoms = [], iconRandom = 0, iconsLoading = false;

                var selectors = Playmo.Games.FindTheIcon.selectors,
                    toClass = Playmo.Utils.selectorToClass;

                var onStartHandlers = [],
                    onFinishHandlers = [];

                config = Object.assign(defaultConfig, config);

                if (config.totalPicksRound >= config.iconsToShow) throw new Error('Playmo Find The Icon: Min totalPicksRound must be less than the iconsToShow');
                if (config.totalRounds > 10) throw new Error('Playmo Find The Icon: totalRounds must be less than 10');

                function render() {
                    $elem.innerHTML = '<div class="' + toClass(selectors.wrapper) + '"><div class="' + toClass(selectors.iconContainer) + '"></div></div>';

                    var $wrapper = $(selectors.wrapper);
                    var $iconContainer = $(selectors.iconContainer);

                    if (config.maxTime) {
                        var $timer = document.createElement('div');
                        $timer.classList.add(toClass(selectors.timer));
                        $wrapper.prepend($timer);
                    }

                    iconRandom = Math.floor(Math.random() * config.iconsToShow);

                    for (var i = 0; i < config.iconsToShow; i++) {
                        if (i != iconRandom) {
                            $iconContainer.append('<div class="' + toClass(selectors.icon) + '">' +
                                '<img class="img-fluid" src="' + config.sameIcon + '" /></div>');
                        } else {
                            $iconContainer.append('<div class="' + toClass(selectors.icon) + " " + toClass(selectors.iconFound) + '">' +
                                '<img class="img-fluid" src="' + config.differentIcon + '" /></div>');
                        }
                    }

                    addEvents();
                }

                function addEvents() {
                    $(selectors.icon).on("click", function () {
                        var $icon = $(this);
                        if ($icon.hasClass(toClass(selectors.iconPicked)) || iconsLoading === true) {
                            return;
                        } else {
                            picks++;
                            $icon.addClass(toClass(selectors.iconPicked) + ' animated shake');
                            if (picks === config.totalPicksRound && !$icon.hasClass(toClass(selectors.iconFound))) {
                                timer.pause();
                                $(selectors.iconFound).addClass('animated bounceIn infinite');
                                $(selectors.icon + ':not(' + selectors.iconFound + ')').addClass(toClass(selectors.iconPicked));
                                setTimeout(function () {
                                    finish(false);
                                }, 2000);
                            }
                        }

                        if ($icon.hasClass(toClass(selectors.iconFound))) {
                            $icon.addClass('animated bounceIn');
                            round++;
                            if (round === config.totalRounds) {
                                iconsLoading = true;
                                timer.pause();
                                setTimeout(function () {
                                    finish(true);
                                }, 1500);
                            } else {
                                $(selectors.iconContainer).removeClass('animated fadeIn fadeOut');
                                reset();
                            }
                        }
                    });
                }

                function reset() {
                    iconsLoading = true;
                    $iconContainer = $(selectors.iconContainer);
                    picks = 0;
                    timer.pause();
                    $(selectors.iconContainer).addClass('animated fadeOut');

                    setTimeout(function () {

                        $(selectors.icon)
                            .removeClass(toClass(selectors.iconPicked + " animated bounceIn shake"));

                        $(selectors.iconFound)
                            .removeClass(toClass(selectors.iconFound))
                            .replaceWith('<div class="' + toClass(selectors.icon) + '">' +
                                '<img class="img-fluid" src="' + config.sameIcon + '" /></div>');

                        iconRandom = Math.floor(Math.random() * config.iconsToShow);

                        $(selectors.icon).eq(iconRandom)
                            .replaceWith('<div class="' + toClass(selectors.icon) + " " + toClass(selectors.iconFound) + '">' +
                                '<img class="img-fluid" src="' + config.differentIcon + '" /></div>');

                        setTimeout(function () {
                            $(selectors.iconContainer)
                                .removeClass('fadeOut')
                                .addClass('fadeIn');
                            timer.start();
                            iconsLoading = false;
                            addEvents();
                        }, 500);
                    }, 1000);

                }

                function finish(winner) {
                    timer.pause();
                    onFinishHandlers.forEach(function (handler) {
                        handler({ winner, time: timer.remaining() });
                    });
                }

                function start() {
                    if (config.maxTime) {
                        timer = Playmo.Utils.Timer.create($(selectors.timer), {
                            maxTime: config.maxTime,
                            step: config.timerStep,
                            reverse: config.timerReverse,
                            format: config.timerFormat,
                        });

                        timer.onFinish(function () {
                            iconsLoading = true;
                            $(selectors.iconFound).addClass('animated bounceIn infinite');
                            $(selectors.icon + ':not(' + selectors.iconFound + ')').addClass(toClass(selectors.iconPicked));
                            setTimeout(function () {
                                finish(false);
                            }, 2000);
                        });

                        timer.start();
                    }
                }

                return {
                    render: render,
                    start: start,
                    onStart: function (handler) {
                        onStartHandlers.push(handler);
                        return this;
                    },
                    onFinish: function (handler) {
                        onFinishHandlers.push(handler);
                        return this;
                    }
                }
            },
        }
    },
    Lang: {
        translations: {},
        default: null,
        trans: function (key, replace) {
            let translation
            const gameText = Playmo.Promo.gameTexts[key]
            if (gameText) {
                translation = gameText[Playmo.Lang.default]
            } else {
                translation = key.split('.')
                    .reduce(
                        function (t, i) {
                            return t[i] || null;
                        },
                        Playmo.Lang.translations
                    );
            }

            replace = replace || {};

            for (var placeholder in replace) {
                translation = translation.replace(':'+placeholder, replace[placeholder]);
            }

            return translation;
        }
    },
    Form: {
        submitMiddlewares: [],
        selectors: {
            loginForm: '#form-login'
        },
        extraData: {
            hash: null,
            query: {},
            custom: {}
        },
        addExtraParam: function(key, value, domain) {
            if (!key) return;
            domain = domain || 'custom'

            if(domain === 'hash') Playmo.Form.extraData[domain] = value
            else Playmo.Form.extraData[domain][key] = value
        },
        removeExtraParam: function(key, domain) {
            if (!key) return;
            domain = domain || 'custom'

            if (domain === 'hash') Playmo.Form.extraData[domain] = null
            else delete Playmo.Form.extraData[domain][key]
        }
    },
    Field: {
        Phone: {
            selector: '.pl-input-phone',
            initialCountry: 'es',
            preferredCountries: [],
            onlyCountries: [ 'es', 'gb', 'pt', 'fr', 'it', 'de', 'nl', 'eu' ],
            formatOnDisplay: true
        }
    },
    field: function (fieldId) {
        return $('[name="'+fieldId+'"]');
    },
    prize: null
};

Playmo.Storage = (function () {
    var PREFIX = 'pl-';
    var storage = window.localStorage;

    var isAvailable = (function () {
        if (typeof storage == 'undefined') {
            console.warn('Playmo: Playmo.Storage is not available');
            return false;
        }
        var testKey = 'pl-test-key_uadgsyfkusyfgkus';
        try {
            storage.setItem(testKey, testKey);
            storage.getItem(testKey);
            storage.removeItem(testKey);
            return true;
        }
        catch (err) {
            console.warn('Playmo: Playmo.Storage is not available');
            return false;
        }
    })();

    function prefixKey (key) {
        return PREFIX + key;
    }

    function set (key, value) {
        if (!isAvailable) return this;

        storage.setItem(prefixKey(key), JSON.stringify(value));

        return this;
    }

    function get (key) {
        if (!isAvailable) return null;

        return JSON.parse(storage.getItem(prefixKey(key)));
    }

    function remove (key) {
        if (!isAvailable) return;

        storage.removeItem(prefixKey(key));

        return this;
    }

    function clear () {
        if (!isAvailable) return;

        storage.clear();

        return this;
    }

    return {
        set: set,
        get: get,
        remove: remove,
        clear: clear
    }
})();

window.ParsleyConfig.excluded = ".pl-custom-select select, input[type=hidden]";
window.ParsleyConfig.focus = 'none';
window.ParsleyConfig.errorsContainer = function(pEle) {
    var $err = pEle.$element.closest('.pl-field');
    return $err;
}
window.ParsleyConfig.classHandler = function(pEle) {
    var $err = pEle.$element.closest('.pl-field');
    return $err;
}

window.Parsley.on('form:validate', function (form) {
    if (!form.isValid()) {
        $('#call-to-action').removeAttr('disabled');
    }
});

// document.addEventListener(CUSTOM_EVENTS.PAGE_VIEW, function (event) {
//     if (!useGA) return;
//     gtag('config', gaTrackingId, {'page_path': '/' + event.detail});
//     // gtag('event', 'page_view');
// });
//
// document.addEventListener(CUSTOM_EVENTS.LEAD_CONVERSION, function (event) {
//     if (!useGA) return;
//     gtag('event', 'lead_dimension', {'lead': '' + event.detail});
// });

var isStorageAvailable = function (storage) {
    if (typeof storage == 'undefined') return false;
    try { // hack for safari incognito
        storage.setItem('storage', '');
        storage.getItem('storage');
        storage.removeItem('storage');
        return true;
    }
    catch (err) {
        return false;
    }
};
var isLocalStorageAvailable = isStorageAvailable(window.localStorage);

function triggerEvent(name, data) {
    var event;
    if (window.CustomEvent) {
        event = new CustomEvent(name, {detail: data});
    } else {
        event = document.createEvent('CustomEvent');
        event.initCustomEvent(name, true, true, data);
    }

    document.dispatchEvent(event);
}

function setItem(key, value) {
    if (!isLocalStorageAvailable) return;
    window.localStorage.setItem(key, value);
}

function getItem(key) {
    if (!isLocalStorageAvailable) return;
    return window.localStorage.getItem(key);
}

function removeItem(key) {
    if (!isLocalStorageAvailable) return;
    window.localStorage.removeItem(key);
}

function showErrors(error) {
    swal({
        customClass: 'sw-playmo',
        title: "¡Ups!",
        text: error,
        html: true,
        type: "error",
    });

    $('.g-recaptcha').length && grecaptcha.reset()
}

function showViewport(error) {
    triggerEvent(CUSTOM_EVENTS.PRE_SHOW_VIEWPORT);

    var containerImgLoad = imagesLoaded('#pl-main-content', { background: true });

    containerImgLoad.on('done', function (instance) {

    });

    containerImgLoad.on('fail', function (instance) {
        console.warn('No background image !!');
    });

    containerImgLoad.on('always', function (instance) {
        window.scrollTo(0,0);
        $('.pl-spinner-container').fadeOut(400);
        $('body').css('overflow', 'auto');
        $('#pl-container').fadeIn(400);

        triggerEvent(CUSTOM_EVENTS.POST_SHOW_VIEWPORT);

        error && setTimeout(function () {
            showErrors(error);
        }, 350);
    });
}

function hideViewport() {
    $('#pl-container').fadeOut(400);
    $('body').css('overflow', 'hidden');
    $('.pl-spinner-container').fadeIn(400);
}

function showFirstSection() {
    if (Playmo.User) {
        Playmo.Sections.goTo('#form', {}, showHeader);
    } else if (Playmo.Sections.config.hasAclSection) {
        Playmo.Sections.goTo('#acl', {}, showHeader);
    } else if (Playmo.Sections.config.hasLandingSection) {
        Playmo.Sections.goTo('#landing', {}, showHeader);
    } else if (Playmo.Sections.config.hasSSO) {
        goToSSO();
    } else {
        Playmo.Sections.goTo('#form', {}, showHeader);
    }
}

function showHeader() {
    $('header').removeClass('hidden').addClass('slideInDown');
}

function goToSSO () {
    Playmo.Sso.redirect();
}

function hideGameSection() {
    setPrizeData();

    $('.js-share-list').removeClass('hidden');

    if (Playmo.Sections.config.hasResultSection) showResult();
    else showPrize();

    Playmo.Ajax.confirm(Playmo.play.playId);
}

function showResult() {
    Playmo.Sections.goTo('#result', {}, () => {
        if (!Playmo.Sections.config.hasPrizeSection) return;

        $('.js-to-prize').one('animationend', () => {
            $(this).toggleClass('animated slideInRight');
        }).toggleClass('hidden animated slideInRight');
    });
}

function showPrize() {
    Playmo.Sections.goTo('#prize', { animationIn: 'rubberBand', animationDelayIn: 0 }, () => {
        $('.js-to-exchange').one('animationend', () => {
            $(this).toggleClass('animated slideInRight');
        }).toggleClass('hidden animated slideInRight');
    });
}

function setPrizeData() {
    var play = Playmo.play;
    var prize = Playmo.prize;
    var shouldShowExchangeCode = prize.show_code_screen === 1;
    var hasScreenInstruction = prize.screen_instruction.length > 0;

    if(shouldShowExchangeCode) {
        $('.js-exchange-code').text(play.exchange_code);
    } else {
        $('.js-wrap-exchange-code').css('display', 'none');
    }

    if(hasScreenInstruction) $('.js-exchange-instructions').html(prize.screen_instruction);
    if(!shouldShowExchangeCode && !hasScreenInstruction) $('.js-to-exchange').remove();

    /** HIDE EXCHANGE SECTION WHEN IS NO PRIZE **/
    if(prize.no_prize === 1) $('.js-to-exchange').remove();

    $('.js-gift-html').html(prize.html);
    $('.js-gift-image').attr('src', prize.image);
}

function exchange() {
    var rangeValue = parseFloat($('.js-exchange-slider').val());

    if(rangeValue < 10) return;

    swal({
        title: Playmo.Lang.trans('screen.exchange.modal.exchanging.title'),
        text: Playmo.Lang.trans('screen.exchange.modal.exchanging.p1'),
        allowOutsideClick: false,
        confirmButtonText: 'Canjear',
        closeOnConfirm: false,
        showLoaderOnConfirm: true
    }, function () {
        $.ajax({
            url: `${window.location.href}api/exchange/${Playmo.play.exchange_code}`,
            method: 'PUT',
            success: function(exchangeResponse) {
                swal({
                        title: Playmo.Lang.trans('screen.exchange.modal.exchanged.title'),
                        text: Playmo.Lang.trans('screen.exchange.modal.exchanged.p1'),
                        type: "success",
                        confirmButtonText: Playmo.Lang.trans('screen.exchange.modal.exchanged.button'),
                        closeOnConfirm: true,
                        showCancelButton: false
                    },
                    function() {
                        $('#exchange.js-section')
                            .html('')
                            .append(`<h3 class="animated slideInLeft">${Playmo.Lang.trans('screen.exchange.after_exchange.title')}</h3>`)
                            .append(`<p class="animated slideInRight">${Playmo.Lang.trans('screen.exchange.after_exchange.p1')}</p>`);

                        $('#prize.js-section').addClass('if-exchanged');
                    });
            },
            error: function(jqXHR, textStatus, error) {
                swal({
                    customClass: 'sw-playmo',
                    title: "¡Ups!",
                    text: error,
                    html: true,
                    type: "error",
                });
            }
        });
    })
}

function getDataFromForm($form) {
    var data;

    $('input[name^="policy"]').each(function (i, e) {
        $(this).attr('name', 'policy[]');
    });

    if ($('.js-referral-field') && $('.js-referral-field').val() === '') {
        $('.js-referral-field').val('no-reply@playmo.es')
    }

    data = new FormData($form[0]);

    $('input[name^="policy"]').each(function (i, e) {
        $(this).attr('name', 'policy' + (i + 1));
    });


    $('.js-referral-field').val('')

    var languageCustom = getItem('language_custom');
    if (languageCustom) {
        data.append('language_custom', languageCustom);
    }

    data.append('visit_id', $('meta[name="_visit"]').attr('content'));
    data.append('extraData', JSON.stringify(Playmo.Form.extraData))

    return data;
}

$(function () {
    Playmo.Url.getExtraParams();

    $(document)
        .ajaxError(function (event, request, settings, error) {
            if(settings.suppressErrors) {
                return;
            }

            var listErrors = '<ul class="sw-list-errors">';

            if (error !== 'Internal Server Error') {
                var response = request.responseJSON,
                    errors = response.message[0];

                errors.forEach(function (e) {
                    listErrors += '<li>' + e + '</li>';
                })
            } else {
                listErrors += '<li>'+Playmo.Lang.trans('unexpected_error')+'</li>';
            }

            listErrors += '</ul>';

            showViewport(listErrors);
        });

    if (Playmo.Promo.state === 'demo' && prizesDemo) {
        var $prizesDemo = $('#pl-prizes-demo');
        var $selectPrizeDemo = $('#pl-select-prize-demo');

        $('#form-login').append('<input id="inptPrizeDemo" type="hidden" name="prizeDemo">');

        for (var i = 0; i < prizesDemo.length; i++) {
            $selectPrizeDemo.append('<option value="' + prizesDemo[i].id + '">' + prizesDemo[i].name + '</option>');
        }

        $prizesDemo.show();

        $selectPrizeDemo.on('change', function () {
            var $self = $(this);

            $('#prizeDemoSelected').text($self.find('option:selected').first().text());
            $('#inptPrizeDemo').val($self.val());
        });
    }

    showViewport();

    showFirstSection();

    $('input[type="file"]').on('change', function () {
        var file = this.files.item(0);
        var fileName = file.name.length <= 23 ? file.name : file.name.substr(0, 20) + '...';

        if (file.size >= 12582912) {
            this.value = '';
            swal({
                title: Playmo.Lang.trans('file_too_big'),
                type: "error"
            });
            return;
        }

        swal({
            title: Playmo.Lang.trans('file_upload_succesfully'),
            type: "success"
        });

        $(this).siblings('label').first()
            .addClass('pl-if-updloaded')
            .text(fileName);

    })

    if ($.fn.datepicker) {
        $('.datepicker').datepicker({
            language: 'es',
            autoclose: true
        });
    }

    if ($.fn.clockpicker) {
        $('.clockpicker').clockpicker({
            autoclose: true,
            align: 'center',
            placement: 'top',
            'default': 'now'
        });
    }

    if ($.fn.typeahead) {
        function typeaheadMatcher (source) {
            return function findMatches(q, cb) {
                var matches = [];

                // regex used to determine if a string contains the substring `q`
                substrRegex = new RegExp(q, 'i');

                // iterate through the pool of strings and for any string that
                // contains the substring `q`, add it to the `matches` array
                $.each(source, function (i, str) {
                    if (substrRegex.test(str)) {
                        matches.push(str);
                    }
                });

                cb(matches);
            };
        }

        $('.typeahead').each(function () {
            var $this = $(this);
            var source = window[$this.attr('data-source')] || [];

            $this.typeahead(
                {
                    hint: true,
                    highlight: true,
                    minLength: 1
                },
                {
                    limit: 4,
                    source: typeaheadMatcher(source)
                }
            );
        });

        $('input.typeahead').each(function () {
            $(this).addClass('form-control');
        });

        $('body').on(
            'typeahead:change',
            '.typeahead',
            function () {
                $(this).parsley().validate();
            })
    }

    if ($.fn.intlTelInput) {
        var $input = $(Playmo.Field.Phone.selector);
        var defaultCountry = $input.data('defaultCountry');
        $input
            .intlTelInput({
                hiddenInput: $input.data('id'),
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.min.js",
                initialCountry: defaultCountry || Playmo.Field.Phone.initialCountry,
                preferredCountries: Playmo.Field.Phone.preferredCountries,
                onlyCountries: Playmo.Field.Phone.onlyCountries,
                formatOnDisplay: Playmo.Field.Phone.formatOnDisplay
            });
    }

    window.Parsley
        .addValidator('zipSpainGmaps', {
            validateString: function (value, _, $field) {
                $field.reset();
                if (value != parseInt(value, 10)) return $.Deferred().reject('El CP no existe');

                var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=spain,' + value + '&key=AIzaSyA08fDpyiJWFgqPHp3BeoIAe4DknWjqoJs';
                var xhr = $.getJSON(url);

                return xhr.then(
                    function (response) {
                        if (response.status !== 'OK') return $.Deferred().reject('El CP no existe');

                        for (var i = 0; i < response.results.length; i++) {
                            var result = response.results[i];
                            if (result.types.indexOf('postal_code') === -1) continue;

                            var components = result.address_components;
                            for (var j = 0; j < components.length; j++) {
                                var component = components[j];
                                if (component.types.indexOf('country') === -1) continue;
                                if (component.short_name !== 'ES') return $.Deferred().reject('El CP no es de España');

                                return $.Deferred().resolve();
                            }
                        }

                        return $.Deferred().reject('El CP no existe');
                    }
                );
            }
        })
        .addValidator('zipSpain', {
            validateString: function (value) {
                var intValue = parseInt(value, 10);
                if (intValue != value) return false;

                return intValue > 1000 && intValue < 53000;
            },
            messages: {
                es: 'No es un Código Postal válido'
            }
        })
        .addValidator('phone', {
            validateString: function (value, requirements, field) {
                return field.$element.intlTelInput('isValidNumber');
            },
            validateNumber: function (value, requirements, field) {
                return field.$element.intlTelInput('isValidNumber');
            }
        })
        .addValidator('dni', {
            requirementType: 'string',
            validateString: function (value, requirement, parsleyInstance) {

                var validChars = 'TRWAGMYFPDXBNJZSQVHLCKET';
                var nifRexp = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKET]$/i;
                var nieRexp = /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKET]$/i;
                var str = value.toString().toUpperCase();

                if (!nifRexp.test(str) && !nieRexp.test(str)) return false;

                var nie = str
                    .replace(/^[X]/, '0')
                    .replace(/^[Y]/, '1')
                    .replace(/^[Z]/, '2');

                var letter = str.substr(-1);
                var charIndex = parseInt(nie.substr(0, 8)) % 23;

                if (validChars.charAt(charIndex) === letter) return true;

                return false;

            },
            messages: {
                en: 'Personal identification is not valid',
                es: 'El dni no es válido',
                de: 'Persönliche Identifikation ist nicht gültig',
                it: 'L\'identificazione personale non è valida',
                fr: 'L\'identification personnelle n\'est pas valide',
                pt: 'A identificação pessoal não é válida',
            }
        })
        .addValidator('filemaxmegabytes', {
            requirementType: 'string',
            validateString: function (value, requirement, parsleyInstance) {

                var file = parsleyInstance.$element[0].files;
                var maxBytes = requirement * 1024 * 1024;

                if (file.length == 0) {
                    return true;
                }

                return file.length === 1 && file[0].size <= maxBytes;

            },
            messages: {
                en: 'File is to big',
                es: 'La imagen es demasiado grande',
                de: 'Archivo muy grande',
                it: 'Archivo muy grande',
                fr: 'Archivo muy grande',
                pt: 'File is to big',
            }
        })
        .addValidator('image', {
            requirementType: 'string',
            validateString: function (value, requirement, parsleyInstance) {

                var file = parsleyInstance.$element[0].files;

                if (file.length == 0) {
                    return true;
                }

                return ['image/gif', 'image/png', 'image/jpeg', 'image/bmp', 'image/webp'].indexOf(file[0].type) !== -1;

            },
            messages: {
                en: 'File mime type not allowed',
                es: 'No es una imagen',
                de: 'Archivo debe ser una imagen',
                it: 'Archivo debe ser una imagen',
                fr: 'Archivo debe ser una imagen',
            }
        })
        .addValidator('filemimetypes', {
            requirementType: 'string',
            validateString: function (value, requirement, parsleyInstance) {

                var file = parsleyInstance.$element[0].files;

                if (file.length == 0) {
                    return true;
                }

                var allowedMimeTypes = requirement.replace(/\s/g, "").split(',');
                return allowedMimeTypes.indexOf(file[0].type) !== -1;

            },
            messages: {
                en: 'File mime type not allowed',
                es: 'No es una imagen',
                de: 'Archivo debe ser una imagen',
                it: 'Archivo debe ser una imagen',
                fr: 'Archivo debe ser una imagen',
            }
        })
        .addValidator('typeahead', {
            requirementType: 'string',
            validateString: function (value, requirement, parsleyInstance) {
                var options = window[requirement] || [];
                if (options.length === 0) console.warn('[Parsley Js]: El buscador no tiene una lista (' + requirement + ') de opciones definidas')

                return options.indexOf(value) !== -1;
            },
            messages: {
                en: 'This option is not allowed',
                es: 'No es una opción válida',
                de: 'Es ist keine gültige Option',
                it: 'Archivo debe ser una imagen',
                fr: 'ce n\'est pas une option valable'
            }
        });

    $('body')
        .on('change', '.js-robinson-check', function () {
            $('[name="' + $(this).attr('data-target') + '"]').val($(this).is(':checked') ? 'Si' : 'No')
        })
        .on('change', '.pl-input-phone', function () {
            var $self = $(this);

            $self.closest('.pl-field').find('input[type="hidden"]').val($self.intlTelInput('getNumber', intlTelInputUtils.numberFormat.E164));
        })
        .on('click', '.js-btn-disclaimer-no', function () {
            showErrors(`<ul class="sw-list-errors"><li>${Playmo.Lang.trans('screen.acl.forbidden_message')}</li></ul>`);
        })
        .on('click', '.js-btn-disclaimer-yes:not(:disabled)', function () {
            if (Playmo.Sections.config.hasLandingSection) {
                Playmo.Sections.goTo('#landing', {animationOut: 'zoomOut'});
            } else if (Playmo.Sections.config.hasSSO) {
                $(this).prop('disabled', true).addClass('if-loading');
                goToSSO();
            } else {
                $('header').removeClass('if-big');
                Playmo.Sections.goTo('#form');
            }
        })
        .on('click', '.js-btn-to-form', function () {
            if (Playmo.Sections.config.hasSSO) {
                goToSSO();
            } else {
                $('header').removeClass('if-big');
                Playmo.Sections.goTo('#form');
            }
        })
        .on('click', '.js-btn-to-game:not(:disabled)', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var button = $(this);

            button.prop('disabled', true).addClass('if-loading');

            $('.js-main-form')
                .parsley()
                .whenValidate()
                .fail(() => {
                    button.prop('disabled', false).removeClass('if-loading');
                })
                .then(() => {
                    Playmo.Ajax.main()
                        .done(function (response) {
                            winner = response.winner;
                            Playmo.prize = response.prize;
                            Playmo.pack = response.pack;
                            Playmo.play = response;

                            $('header').removeClass('if-big');

                            if (Playmo.Sections.config.hasGameSection) {
                                $('header').addClass('if-fixed');
                                createGame();
                                Playmo.Sections.goTo('#game');
                            } else {
                                hideGameSection()
                            }
                        })
                        .fail(function (jqXHR, textStatus, error) {
                            var listErrors = '<ul class="sw-list-errors">';

                            if (error !== 'Internal Server Error') {
                                var response = jqXHR.responseJSON,
                                    errors = response.message[0];

                                errors.forEach(function (e) {
                                    listErrors += '<li>' + e + '</li>';
                                })
                            } else {
                                listErrors += `<li>${Playmo.Lang.trans('unexpected_error')}</li>`;
                            }

                            listErrors += '</ul>';

                            showViewport(listErrors);
                        })
                        .always(function () {
                            button.prop('disabled', false).removeClass('if-loading');
                        });
                });
        })
        .on('click', '.js-to-exchange', function () {
            $('.js-btn-navigation').addClass('hidden');
            Playmo.Sections.goTo('#exchange', {}, () => {
                $('.js-to-prize').one('animationend', () => {
                    $(this).toggleClass('animated slideInRight');
                }).toggleClass('hidden animated slideInRight');
            });
        })
        .on('click', '.js-to-prize', function () {
            $('.js-btn-navigation').addClass('hidden');
            Playmo.Sections.goTo('#prize', {animationIn: 'slideInDown', animationOut: 'slideOutDown'}, () => {
                $('.js-to-exchange').one('animationend', () => {
                    $(this).toggleClass('animated slideInRight');
                }).toggleClass('hidden animated slideInRight');
            });
        })
        .on('click', '.js-btn-toggle-share-links', function () {
            $('.js-share-list').toggleClass('if-open');
        })
        .on('click', '.js-btn-share-link', function () {
            $('.js-share-list').removeClass('if-open');
        })
        .on('change', '.js-exchange-slider', function (e) {
            e.preventDefault();
            e.stopPropagation();

            exchange();
        })
        .on('change', '.js-pl-custom-select select', function () {
            var $self = $(this),
                value = $self.val(),
                $inputHidden = $(this).siblings('input[type="hidden"]'),
                $inputVisible = $(this).siblings('input[type="text"]');

            $inputHidden.val(value);
            $inputVisible.val($self.find(`option[value="${value}"]`).text());
            $inputVisible.parsley().validate();
        });

    /* Legacy from play_v3 */
    $(document.body)
        .on('submit', Playmo.Form.selectors.loginForm, function (event) {
            event.preventDefault();
        })
        // .on('click', Playmo.Legal.Popup.selectors.callToAction, function () {
        //     event.preventDefault();
        //
        //     var $global = $(Playmo.Legal.Popup.selectors.globalCheckbox);
        //     if (!$global.is(':checked')) {
        //         $(Playmo.Legal.Popup.selectors.modal).modal();
        //     } else {
        //         executeLogin(submitLogin);
        //     }
        // })
        // .on('click', '.pl-legal-popup input', function (event) {
        //     event.preventDefault();
        //
        //     $(Playmo.Legal.Popup.selectors.modal).modal();
        // })
        // .on('hide.bs.modal', Playmo.Legal.Popup.selectors.modal, function () {
        //     var $checkboxes = $(this).find('input[type="checkbox"]'),
        //         $optionalCheckboxes = $checkboxes.filter('[data-optional]'),
        //         $mandatoryCheckboxes = $checkboxes.filter(':not([data-optional])');
        //
        //     var mandatoryCheckboxNotChecked = !!$mandatoryCheckboxes
        //         .filter(function () {
        //             return !$(this).is(':checked');
        //         })
        //         .size();
        //
        //     $(Playmo.Legal.Popup.selectors.globalCheckbox).prop('checked', !mandatoryCheckboxNotChecked);
        //
        //     $optionalCheckboxes.each(function (index, element) {
        //         $('[name="'+element.dataset.field+'"]').val(element.checked ? 'si' : 'no');
        //     });
        // });

});

// function executeLogin(func) {
//     var $form = $('#form-login');
//
//     $form
//         .parsley()
//         .whenValidate()
//         .fail(function (e) { })
//         .then(function () {
//             if ($('.g-recaptcha').length) {
//                 grecaptcha.execute()
//             } else {
//                 func()
//             }
//         });
// }

// function submitLogin() {
//     var $self = $('#call-to-action'),
//         $form = $('#form-login'),
//         url = $form.attr('action'),
//         data = getDataFromForm($form);
//
//     nextScreen(url, data, $self, loadMain);
// }

// function loadMain(response) {
//     triggerEvent(CUSTOM_EVENTS.PAGE_VIEW, 'main');
//     triggerEvent(CUSTOM_EVENTS.LEAD_CONVERSION, response.playId);
//     triggerEvent(CUSTOM_EVENTS.PLAY_SUCCED, response);
//
//     var lang = response.lang,
//         playId = response.playId,
//         multiplePrize = response.prize.prizeChildren && response.prize.prizeChildren.length > 1;
//
//     winner = response.winner;
//     exchangeCode = response.exchange_code;
//     prize = response.prize;
//
//     Playmo.prize = response.prize;
//     Playmo.pack = response.pack;
//     Playmo.play = response;
//
//     !prize.show_code_screen && $('#content-code').remove();
//     $('#pl-prizes-demo').remove();
//
//     $('#top-content').after(prize.html);
//     $('#code').text(exchangeCode);
//     $('#content-code, #top-prize').addClass('hidden');
//
//     if (prize.screen_instruction) {
//         $('body').append('<div id="instructions"><p>' + prize.screen_instruction + '</p></div>');
//     }
//
//     if (prize.show_date_play) {
//         $('#show_date_play').text(moment().format('DD/MM/YY HH:mm'));
//     } else {
//         $('#show_date_play').remove();
//     }
//
//     $(document)
//         .on('content:loaded', function () {
//             showViewport();
//         })
//         .on('click', '#js-share-fb', function (e) {
//             var $self = $(this);
//
//             feedPostInFacebook(getDataForPostFeed($self), null);
//         })
//         .trigger('content:init');
//
//     removeItem('language_custom');
//
//     prizeContent = {
//         multiplePrize: multiplePrize,
//         playId: playId,
//         winner: winner,
//         lang: lang
//     };
//
//     if (multiplePrize) {
//         var $select = $('#prizeSelect'),
//             $confirmButton = $('#confirmPrizeSelect');
//
//         $confirmButton.show();
//
//         $confirmButton.on('click', function () {
//             confirmPlay(
//                 prizeContent.playId,
//                 prizeContent.winner,
//                 prizeContent.lang,
//                 $select.val()
//             );
//
//             var prizeSelected = prize.prizeChildren[$select.get(0).selectedIndex];
//             $('#top-prize').html(prizeSelected.html);
//             $('img#prize').attr('src', prizeSelected.image);
//             $('#instructions').html(prizeSelected.screen_instruction);
//         });
//
//         for (var i = 0; i < response.prize.prizeChildren.length; i++) {
//             var prizeChild = response.prize.prizeChildren[i];
//
//             $select.append('<option data-prize-child="' + i + '" value="' + prizeChild.id + '">' + prizeChild.name + '</option>');
//         }
//
//         $select.selectpicker();
//     }
// }

// function confirmPlay(playId, winner, lang, prizeChildId) {
//     var data = {
//         'playId': playId,
//         'winner': winner,
//         'lang': lang,
//         'prizeChildId': prizeChildId
//     };
//
//     $('#instructions').css({
//         'transform': 'translateY(0%)',
//         '-ms-transform': 'translateY(0%)',
//         '-webkit-transform': 'translateY(0%)'
//     });
//
//     $.ajax({
//         url: '../confirm-play',
//         method: 'POST',
//         data: data,
//         dataType: 'json',
//         headers: {
//             'X-XSRF-TOKEN': $('meta[name="_token"]').attr('content')
//         }
//     });
// }

// function showPrizeContent() {
//     triggerEvent(CUSTOM_EVENTS.PAGE_VIEW, 'prize');
//
//     $('#top-content, #top-prize').toggleClass('hidden');
//     $('*[data-animated]').not('#instructions').each(function () {
//         var $self = $(this),
//             animation = $self.data('animated');
//
//         $self.removeClass('hidden').addClass(animation);
//     });
//
//     if (!prizeContent.multiplePrize) {
//         confirmPlay(prizeContent.playId, prizeContent.winner, prizeContent.lang);
//     }
// }

