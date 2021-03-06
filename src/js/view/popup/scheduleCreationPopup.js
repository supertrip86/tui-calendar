/**
 * @fileoverview Floating layer for writing new schedules
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
'use strict';

var View = require('../../view/view');
var FloatingLayer = require('../../common/floatingLayer');
var util = require('tui-code-snippet');
var DatePicker = require('tui-date-picker');
var timezone = require('../../common/timezone');
var config = require('../../config');
var domevent = require('../../common/domevent');
var domutil = require('../../common/domutil');
var common = require('../../common/common');
var tmpl = require('../template/popup/scheduleCreationPopup.hbs');
var TZDate = timezone.Date;
var MAX_WEEK_OF_MONTH = 6;
var ARROW_WIDTH_HALF = 8;

/**
 * @constructor
 * @extends {View}
 * @param {HTMLElement} container - container element
 * @param {Array.<Calendar>} calendars - calendar list used to create new schedule
 * @param {boolean} usageStatistics - GA tracking options in Calendar
 */
function ScheduleCreationPopup(container, calendars, ifad, usageStatistics) {
  View.call(this, container);
  /**
     * @type {FloatingLayer}
     */
  this.layer = new FloatingLayer(null, container);

  /**
     * cached view model
     * @type {object}
     */
  this._viewModel = null;
  this._selectedCal = null;
  this._schedule = null;
  this.calendars = calendars;
  this.ifad = ifad;
  this._focusedDropdown = null;
  this._usageStatistics = usageStatistics;
  this._onClickListeners = [
    this._selectDropdownMenuItem.bind(this),
    this._toggleDropdownMenuView.bind(this),
    this._closeDropdownMenuView.bind(this, null),
    this._closePopup.bind(this),
    this._toggleIsAllday.bind(this),
    this._toggleIsPrivate.bind(this),
    this._toggleZoom.bind(this),
    this._onClickSaveSchedule.bind(this)
  ];

  domevent.on(container, 'click', this._onClick, this);
}

util.inherit(ScheduleCreationPopup, View);

/**
 * Mousedown event handler for hiding popup layer when user mousedown outside of
 * layer
 * @param {MouseEvent} mouseDownEvent - mouse event object
 */
ScheduleCreationPopup.prototype._onMouseDown = function(mouseDownEvent) {
  var target = domevent.getEventTarget(mouseDownEvent),
    popupLayer = domutil.closest(target, config.classname('.floating-layer'));

  if (popupLayer) {
    return;
  }
  domutil.get(config.cssPrefix + 'input-attachment').value = '';

  this.hide();
};

/**
 * @override
 */
ScheduleCreationPopup.prototype.destroy = function() {
  this.layer.destroy();
  this.layer = null;
  domevent.off(this.container, 'click', this._onClick, this);
  domevent.off(document.body, 'mousedown', this._onMouseDown, this);
  View.prototype.destroy.call(this);
};

/**
 * @override
 * Click event handler for close button
 * @param {MouseEvent} clickEvent - mouse event object
 */
ScheduleCreationPopup.prototype._onClick = function(clickEvent) {
  var target = domevent.getEventTarget(clickEvent);

  util.forEach(this._onClickListeners, function(listener) {
    return !listener(target);
  });
};

/**
 * Test click event target is close button, and return layer is closed(hidden)
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether popup layer is closed or not
 */
ScheduleCreationPopup.prototype._closePopup = function(target) {
  var className = config.classname('popup-close');

  if (domutil.hasClass(target, className) || domutil.closest(target, '.' + className)) {
    domutil.get(config.cssPrefix + 'input-attachment').value = '';
    this.hide();

    return true;
  }

  return false;
};

/**
 * Toggle dropdown menu view, when user clicks dropdown button
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether user clicked dropdown button or not
 */
ScheduleCreationPopup.prototype._toggleDropdownMenuView = function(target) {
  var className = config.classname('dropdown-button');
  var dropdownBtn = domutil.hasClass(target, className) ? target : domutil.closest(target, '.' + className);

  if (!dropdownBtn) {
    return false;
  }

  if (domutil.hasClass(dropdownBtn.parentNode, config.classname('open'))) {
    this._closeDropdownMenuView(dropdownBtn.parentNode);
  } else {
    this._openDropdownMenuView(dropdownBtn.parentNode);
  }

  return true;
};

/**
 * Close drop down menu
 * @param {HTMLElement} dropdown - dropdown element that has a opened dropdown menu
 */
ScheduleCreationPopup.prototype._closeDropdownMenuView = function(dropdown) {
  dropdown = dropdown || this._focusedDropdown;
  if (dropdown) {
    domutil.removeClass(dropdown, config.classname('open'));
    this._focusedDropdown = null;
  }
};

/**
 * Open drop down menu
 * @param {HTMLElement} dropdown - dropdown element that has a closed dropdown menu
 */
ScheduleCreationPopup.prototype._openDropdownMenuView = function(dropdown) {
  domutil.addClass(dropdown, config.classname('open'));
  this._focusedDropdown = dropdown;
};

/**
 * If click dropdown menu item, close dropdown menu
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether
 */
ScheduleCreationPopup.prototype._selectDropdownMenuItem = function(target) {
  var itemClassName = config.classname('dropdown-menu-item');
  var ifadClassName = config.classname('popup-section-ifad');
  var iconClassName = config.classname('icon');
  var contentClassName = config.classname('content');
  var selectedItem = domutil.hasClass(target, itemClassName) ? target : domutil.closest(target, '.' + itemClassName);
  var bgColor, title, dropdown, dropdownBtn;

  if (!selectedItem) {
    return false;
  }

  title = domutil.find('.' + contentClassName, selectedItem).innerHTML;

  dropdown = domutil.closest(selectedItem, config.classname('.dropdown'));
  dropdownBtn = domutil.find(config.classname('.dropdown-button'), dropdown);
  domutil.find('.' + contentClassName, dropdownBtn).innerText = title;

  if (selectedItem && !domutil.hasClass(target, ifadClassName)) {
    bgColor = domutil.find('.' + iconClassName, selectedItem).style.backgroundColor || 'transparent';
    if (domutil.hasClass(dropdown, config.classname('section-calendar'))) {
      domutil.find('.' + iconClassName, dropdownBtn).style.backgroundColor = bgColor;
      this._selectedCal = common.find(this.calendars, function(cal) {
        return cal.id === domutil.getData(selectedItem, 'calendarId');
      });
    }
  }

  domutil.removeClass(dropdown, config.classname('open'));

  return true;
};

/**
 * Toggle allday checkbox state
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether event target is allday section or not
 */
ScheduleCreationPopup.prototype._toggleIsAllday = function(target) {
  var isChecked = domutil.get(config.cssPrefix + 'schedule-allday') && domutil.get(config.cssPrefix + 'schedule-allday').checked;
  var hasCheckbox = domutil.hasClass(target, config.classname('ic-checkbox'));
  var hasAllDayTitle = domutil.hasClass(target, config.classname('allday-title'));
  var start, end, hrs, allDayStart, allDayEnd;
  if (hasCheckbox || hasAllDayTitle) {
    if (isChecked) {
      hrs = String(new Date().getHours()) + ':' + String((new Date().getMinutes() > 29) ? '30' : '00');
      allDayStart = new Date(domutil.get(config.cssPrefix + 'schedule-start-date').value.replace(' - ', ' ') + ' ' + hrs);
      allDayEnd = moment(allDayStart).add(1, 'hours').toDate();
      domutil.get(config.cssPrefix + 'schedule-allday').checked = false;
      this._createDatepicker(allDayStart, allDayEnd, false);
    } else {
      start = new Date(domutil.get(config.cssPrefix + 'schedule-start-date').value.replace(' - ', ' '));
      end = new Date(domutil.get(config.cssPrefix + 'schedule-end-date').value.replace(' - ', ' '));
      domutil.get(config.cssPrefix + 'schedule-allday').checked = true;
      this._createDatepicker(start, end, true);
    }
  }
};

/**
 * Toggle zoom checkbox state
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether event target is a zoom meeting or not
 */
ScheduleCreationPopup.prototype._toggleZoom = function(target) {
  var isChecked = domutil.get(config.cssPrefix + 'schedule-zoom') && domutil.get(config.cssPrefix + 'schedule-zoom').checked;
  var hasCheckbox = domutil.hasClass(target, config.classname('ic-zoom'));
  var hasZoom = domutil.hasClass(target, config.classname('zoom'));
  if (hasCheckbox || hasZoom) {
    if (isChecked) {
      domutil.get(config.cssPrefix + 'schedule-zoom').checked = false;
    } else {
      domutil.get(config.cssPrefix + 'schedule-zoom').checked = true;
    }
  }
};

/**
 * Toggle private button
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether event target is private section or not
 */
ScheduleCreationPopup.prototype._toggleIsPrivate = function(target) {
  var className = config.classname('section-private');
  var privateSection = domutil.hasClass(target, className) ? target : domutil.closest(target, '.' + className);

  if (privateSection) {
    if (domutil.hasClass(privateSection, config.classname('public'))) {
      domutil.removeClass(privateSection, config.classname('public'));
    } else {
      domutil.addClass(privateSection, config.classname('public'));
    }

    return true;
  }

  return false;
};

/**
 * Save new schedule if user clicked save button
 * @emits ScheduleCreationPopup#saveSchedule
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether save button is clicked or not
 */
ScheduleCreationPopup.prototype._onClickSaveSchedule = function(target) {
  var className = config.classname('popup-save');
  var cssPrefix = config.cssPrefix;
  var title, isPrivate, comments, isAllDay, startDate, endDate, ifadId, zoom;
  var start, end, calendarId;
  var changes;

  if (!domutil.hasClass(target, className) && !domutil.closest(target, '.' + className)) {
    return false;
  }

  title = domutil.get(cssPrefix + 'schedule-title');
  startDate = new TZDate(this.rangePicker.getStartDate()).toLocalTime();
  endDate = new TZDate(this.rangePicker.getEndDate()).toLocalTime();
  ifadId = this.filterIfad('name', domutil.get(config.cssPrefix + 'schedule-ifad').innerText).id;

  if (!title.value) {
    title.focus();

    return true;
  }

  if (!startDate && !endDate) {
    return true;
  }

  comments = domutil.get(cssPrefix + 'schedule-comments');
  isAllDay = !!domutil.get(cssPrefix + 'schedule-allday').checked;
  zoom = !!domutil.get(cssPrefix + 'schedule-zoom').checked;

  if (isAllDay) {
    startDate.setHours(0, 0, 0);
    endDate.setHours(23, 59, 59);
  }

  start = new TZDate(startDate);
  end = new TZDate(endDate);

  if (this._selectedCal) {
    calendarId = this._selectedCal.id;
  }

  if (this._isEditMode) {
    changes = common.getScheduleChanges(
      this._schedule,
      ['calendarId', 'title', 'comments', 'start', 'end', 'isAllDay', 'state', 'ifadId', 'zoom'],
      {
        calendarId: calendarId,
        title: title.value,
        comments: comments.value,
        ifadId: ifadId,
        zoom: zoom,
        start: start,
        end: end,
        isAllDay: isAllDay
      }
    );

    this.fire('beforeUpdateSchedule', {
      schedule: util.extend({
        raw: {
          class: isPrivate ? 'private' : 'public'
        }
      }, this._schedule),
      changes: changes,
      start: start,
      end: end,
      calendar: this._selectedCal,
      triggerEventName: 'click'
    });
  } else {
    /**
         * @event ScheduleCreationPopup#beforeCreateSchedule
         * @type {object}
         * @property {Schedule} schedule - new schedule instance to be added
         */
    this.fire('beforeCreateSchedule', {
      calendarId: calendarId,
      title: title.value,
      comments: comments.value,
      ifadId: ifadId,
      zoom: zoom,
      raw: {
        class: isPrivate ? 'private' : 'public'
      },
      start: start,
      end: end,
      isAllDay: isAllDay
    });
  }

  this.hide();

  return true;
};

/**
 * @override
 * @param {object} viewModel - view model from factory/monthView
 */
ScheduleCreationPopup.prototype.render = function(viewModel) {
  var calendars = this.calendars;
  var layer = this.layer;
  var self = this;
  var boxElement, guideElements;

  viewModel.ifad = this.ifad;
  viewModel.zIndex = this.layer.zIndex + 5;
  viewModel.calendars = calendars;
  if (calendars.length) {
    viewModel.selectedCal = this._selectedCal = calendars[0];
  }

  this._isEditMode = viewModel.schedule && viewModel.schedule.id;
  if (this._isEditMode) {
    boxElement = viewModel.target;
    viewModel = this._makeEditModeData(viewModel);
  } else {
    this.guide = viewModel.guide;
    guideElements = this._getGuideElements(this.guide);
    boxElement = guideElements.length ? guideElements[0] : null;
    viewModel.selectedIfad = this.ifad.length ? this.ifad[0] : null;
  }
  layer.setContent(tmpl(viewModel));
  this._createDatepicker(viewModel.start, viewModel.end, viewModel.isAllDay);
  layer.show();

  if (boxElement) {
    this._setPopupPositionAndArrowDirection(boxElement.getBoundingClientRect());
  }

  util.debounce(function() {
    domevent.on(document.body, 'mousedown', self._onMouseDown, self);
  })();
};

/**
 * Make view model for edit mode
 * @param {object} viewModel - original view model from 'beforeCreateEditPopup'
 * @returns {object} - edit mode view model
 */
ScheduleCreationPopup.prototype._makeEditModeData = function(viewModel) {
  var schedule = viewModel.schedule;
  var title, isPrivate, comments, startDate, endDate, isAllDay, ifadId, zoom;
  var raw = schedule.raw || {};
  var calendars = this.calendars;
  var id = schedule.id;
  var ifad = viewModel.ifad;
  var selectedIfad = this.filterIfad('id', schedule.ifadId);

  title = schedule.title;
  isPrivate = raw['class'] === 'private';
  comments = schedule.comments;
  zoom = schedule.zoom;
  ifadId = schedule.ifadId;
  startDate = schedule.start;
  endDate = schedule.end;
  isAllDay = schedule.isAllDay;
  viewModel.selectedCal = this._selectedCal = common.find(this.calendars, function(cal) {
    return cal.id === viewModel.schedule.calendarId;
  });

  this._schedule = schedule;

  return {
    id: id,
    selectedCal: this._selectedCal,
    selectedIfad: selectedIfad ? selectedIfad : ifad[0],
    calendars: calendars,
    title: title,
    isPrivate: isPrivate,
    comments: comments,
    ifad: ifad,
    ifadId: ifadId,
    zoom: zoom,
    isAllDay: isAllDay,
    start: startDate,
    end: endDate,
    raw: {
      class: isPrivate ? 'private' : 'public'
    },
    zIndex: this.layer.zIndex + 5,
    isEditMode: this._isEditMode
  };
};

/**
 * Set popup position and arrow direction to apear near guide element
 * @param {MonthCreationGuide|TimeCreationGuide|DayGridCreationGuide} guideBound - creation guide element
 */
ScheduleCreationPopup.prototype._setPopupPositionAndArrowDirection = function(guideBound) {
  var layer = domutil.find(config.classname('.popup'), this.layer.container);
  var layerSize = {
    width: layer.offsetWidth,
    height: layer.offsetHeight
  };
  var windowSize = {
    right: window.innerWidth,
    bottom: window.innerHeight
  };
  var parentRect = this.layer.parent.getBoundingClientRect();
  var parentBounds = {
    left: parentRect.left,
    top: parentRect.top
  };
  var pos;

  pos = this._calcRenderingData(layerSize, windowSize, guideBound);
  pos.x -= parentBounds.left;
  pos.y -= (parentBounds.top + 6);
  this.layer.setPosition(pos.x, pos.y);
  this._setArrowDirection(pos.arrow);
};

/**
 * Get guide elements from creation guide object
 * It is used to calculate rendering position of popup
 * It will be disappeared when hiding popup
 * @param {MonthCreationGuide|TimeCreationGuide|AlldayCreationGuide} guide - creation guide
 * @returns {Array.<HTMLElement>} creation guide element
 */
ScheduleCreationPopup.prototype._getGuideElements = function(guide) {
  var guideElements = [];
  var i = 0;

  if (guide.guideElement) {
    guideElements.push(guide.guideElement);
  } else if (guide.guideElements) {
    for (; i < MAX_WEEK_OF_MONTH; i += 1) {
      if (guide.guideElements[i]) {
        guideElements.push(guide.guideElements[i]);
      }
    }
  }

  return guideElements;
};

/**
 * Get guide element's bound data which only includes top, right, bottom, left
 * @param {Array.<HTMLElement>} guideElements - creation guide elements
 * @returns {Object} - popup bound data
 */
ScheduleCreationPopup.prototype._getBoundOfFirstRowGuideElement = function(guideElements) {
  var bound;

  if (!guideElements.length) {
    return null;
  }

  bound = guideElements[0].getBoundingClientRect();

  return {
    top: bound.top,
    left: bound.left,
    bottom: bound.bottom,
    right: bound.right
  };
};

/**
 * Calculate rendering position usering guide elements
 * @param {{width: {number}, height: {number}}} layerSize - popup layer's width and height
 * @param {{top: {number}, left: {number}, right: {number}, bottom: {number}}} parentSize - width and height of the upper layer, that acts as a border of popup
 * @param {{top: {number}, left: {number}, right: {number}, bottom: {number}}} guideBound - guide element bound data
 * @returns {PopupRenderingData} rendering position of popup and popup arrow
 */
ScheduleCreationPopup.prototype._calcRenderingData = function(layerSize, parentSize, guideBound) {
  var guideHorizontalCenter = (guideBound.left + guideBound.right) / 2;
  var x = guideHorizontalCenter - (layerSize.width / 2);
  var y = guideBound.top - layerSize.height + 3;
  var arrowDirection = 'arrow-bottom';
  var arrowLeft;

  if (y < 0) {
    y = guideBound.bottom + 9;
    arrowDirection = 'arrow-top';
  }

  if (x > 0 && (x + layerSize.width > parentSize.right)) {
    x = parentSize.right - layerSize.width;
  }

  if (x < 0) {
    x = 0;
  }

  if (guideHorizontalCenter - x !== layerSize.width / 2) {
    arrowLeft = guideHorizontalCenter - x - ARROW_WIDTH_HALF;
  }

  /**
     * @typedef {Object} PopupRenderingData
     * @property {number} x - left position
     * @property {number} y - top position
     * @property {string} arrow.direction - direction of popup arrow
     * @property {number} [arrow.position] - relative position of popup arrow, if it is not set, arrow appears on the middle of popup
     */
  return {
    x: x,
    y: y,
    arrow: {
      direction: arrowDirection,
      position: arrowLeft
    }
  };
};

/**
 * Set arrow's direction and position
 * @param {Object} arrow rendering data for popup arrow
 */
ScheduleCreationPopup.prototype._setArrowDirection = function(arrow) {
  var direction = arrow.direction || 'arrow-bottom';
  var arrowEl = domutil.get(config.classname('popup-arrow'));
  var borderElement = domutil.find(config.classname('.popup-arrow-border', arrowEl));

  if (direction !== config.classname('arrow-bottom')) {
    domutil.removeClass(arrowEl, config.classname('arrow-bottom'));
    domutil.addClass(arrowEl, config.classname(direction));
  }

  if (arrow.position) {
    borderElement.style.left = arrow.position + 'px';
  }
};

/**
 * Create date range picker using start date and end date
 * @param {TZDate} start - start date
 * @param {TZDate} end - end date
 * @param {boolean} isAllDay - isAllDay
 */
ScheduleCreationPopup.prototype._createDatepicker = function(start, end, isAllDay) {
  var cssPrefix = config.cssPrefix;
  var startDate = start ? start : new Date(start.getFullYear(), start.getMonth(), start.getDate(), new Date().getHours(), (new Date().getMinutes() > 29) ? '30' : '00');
  var endDate = end ? end : moment(startDate).add(1, 'hours').toDate();
  var startAllDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0);
  var endAllDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59);
  var newStart = !isAllDay ? startDate : startAllDay;
  var newEnd = !isAllDay ? endDate : endAllDay;
  var rangePicker = DatePicker.createRangePicker({
    startpicker: {
      date: new TZDate(newStart).toDate(),
      input: '#' + cssPrefix + 'schedule-start-date',
      container: '#' + cssPrefix + 'startpicker-container'
    },
    endpicker: {
      date: new TZDate(newEnd).toDate(),
      input: '#' + cssPrefix + 'schedule-end-date',
      container: '#' + cssPrefix + 'endpicker-container'
    },
    format: isAllDay ? 'dd MMM yyyy' : 'dd MMM yyyy - HH:mm',
    timepicker: isAllDay ? null : {
      showMeridiem: false,
      usageStatistics: this._usageStatistics
    },
    usageStatistics: this._usageStatistics
  });
  rangePicker.on('change:start', function() {
    if (rangePicker.getEndDate() <= rangePicker.getStartDate()) {
      if (isAllDay) {
        rangePicker.setEndDate(moment(rangePicker.getStartDate()).add(1, 'days').toDate());
      } else {
        rangePicker.setEndDate(moment(rangePicker.getStartDate()).add(1, 'hours').toDate());
      }
    }
  });
  this.rangePicker = rangePicker;
};

/**
 * Hide layer
 */
ScheduleCreationPopup.prototype.hide = function() {
  this.layer.hide();

  if (this.guide) {
    this.guide.clearGuideElement();
    this.guide = null;
  }

  domevent.off(document.body, 'mousedown', this._onMouseDown, this);
};

/**
 * refresh layer
 */
ScheduleCreationPopup.prototype.refresh = function() {
  if (this._viewModel) {
    this.layer.setContent(this.tmpl(this._viewModel));
  }
};

/**
 * Set calendar list
 * @param {Array.<Calendar>} calendars - calendar list
 */
ScheduleCreationPopup.prototype.setCalendars = function(calendars) {
  this.calendars = calendars || [];
};

ScheduleCreationPopup.prototype.filterIfad = function(arg, par) {
  var ifad = this.ifad;
  var selected;

  ifad.forEach(function(el) {
    if (el[arg] === par) {
      selected = el;
    }
  });

  return selected;
};

module.exports = ScheduleCreationPopup;
