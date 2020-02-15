'use strict';

/* eslint-disable require-jsdoc */
/* eslint-env jquery */
/* global moment, tui, chance */

// (function IfadCalendar(){
    var ElementPrefix = 'tui-full-calendar-';
    var Calendar = tui.Calendar;
    var CalendarList = [];
    var CalendarData = [
        {
            "Name": "EMC",
            "Color": "#ffffff",
            "BgColor": "#9e5fff"
        },
        {
            "Name": "ERMC",
            "Color": "#ffffff",
            "BgColor": "#00a9ff"
        },
        {
            "Name": "PDMT",
            "Color": "#ffffff",
            "BgColor": "#ff5583"
        },
        {
            "Name": "PMC",
            "Color": "#ffffff",
            "BgColor": "#03bd9e"
        },
        {
            "Name": "OMC",
            "Color": "#ffffff",
            "BgColor": "#bbdc00"
        },
        {
            "Name": "EB/AB/EC",
            "Color": "#ffffff",
            "BgColor": "#ffbb3b"
        },
        {
            "Name": "RCC",
            "Color": "#ffffff",
            "BgColor": "#ff4040"
        }
    ];

    createCalendarList();
    createCalendar(window, Calendar);
    createCalendarMenu();

    function createCalendarList() {
        var calendar;
        var id = 0;
        function CalendarInfo() {
            this.id = null;
            this.name = null;
            this.checked = true;
            this.color = null;
            this.bgColor = null;
            this.borderColor = null;
            this.dragBgColor = null;
        }
        CalendarData.forEach(function(element){
            calendar = new CalendarInfo();
            id += 1;
            calendar.id = String(id);
            calendar.name = element.Name;
            calendar.color = element.Color;
            calendar.bgColor = element.BgColor;
            calendar.dragBgColor = element.BgColor;
            calendar.borderColor = element.BgColor;
            CalendarList.push(calendar);
        });
    };

    function createCalendar(window, Calendar) {
        var cal, resizeThrottled;
        var useCreationPopup = true;
        var useDetailPopup = true;
        var datePicker, selectedCalendar;

        cal = new Calendar('#calendar', {
            defaultView: 'month',
            month: {
                startDayOfWeek: 1,
            },
            useCreationPopup: useCreationPopup,
            useDetailPopup: useDetailPopup,
            calendars: CalendarList,
            template: {
                milestone: function(model) {
                    return '<span class="calendar-font-icon ic-milestone-b"></span> <span style="background-color: ' + model.bgColor + '">' + model.title + '</span>';
                },
                allday: function(schedule) {
                    return getTimeTemplate(schedule, true);
                },
                time: function(schedule) {
                    return getTimeTemplate(schedule, false);
                }
            }
        });

        cal.on({
            'clickMore': function(e) {
                console.log('clickMore', e);
            },
            'clickSchedule': function(e) {
                console.log('clickSchedule', e);
            },
            'clickDayname': function(date) {
                console.log('clickDayname', date);
            },
            'beforeCreateSchedule': function(e) {
                saveNewSchedule(e);
            },
            'beforeUpdateSchedule': function(e) {
                prepareToUpdate(e);
            },
            'beforeDeleteSchedule': function(e) {
                cal.deleteSchedule(e.schedule.id, e.schedule.calendarId);
            },
            'afterRenderSchedule': function(e) {
                var schedule = e.schedule;
            },
            'clickTimezonesCollapseBtn': function(timezonesCollapsed) {
                if (timezonesCollapsed) {
                    cal.setTheme({
                        'week.daygridLeft.width': '77px',
                        'week.timegridLeft.width': '77px'
                    });
                } else {
                    cal.setTheme({
                        'week.daygridLeft.width': '60px',
                        'week.timegridLeft.width': '60px'
                    });
                }
                return true;
            }
        });

        /**
        * A listener for click the menu
        * @param {Event} e - click event
        */
        function findCalendar(id) {
            var found;
            CalendarList.forEach(function(calendar) {
                if (calendar.id === id) {
                    found = calendar;
                }
            });
            return found || CalendarList[0];
        }

        function getTimeTemplate(schedule, isAllDay) {
            var html = [];
            var start = moment(schedule.start.toUTCString());
            if (!isAllDay) {
                html.push('<strong>' + start.format('HH:mm') + '</strong> ');
            }
            if (schedule.isPrivate) {
                html.push('<span class="calendar-font-icon ic-lock-b"></span>');
                html.push(' Private');
            } else {
                if (schedule.isReadOnly) {
                    html.push('<span class="calendar-font-icon ic-readonly-b"></span>');
                } else if (schedule.recurrenceRule) {
                    html.push('<span class="calendar-font-icon ic-repeat-b"></span>');
                } else if (schedule.attendees.length) {
                    html.push('<span class="calendar-font-icon ic-user-b"></span>');
                } else if (schedule.location) {
                    html.push('<span class="calendar-font-icon ic-location-b"></span>');
                }
                html.push(' ' + schedule.title);
            }

            return html.join('');
        }
        
        function onClickMenu(e) {
            var target = $(e.target).closest('a[role="menuitem"]')[0];
            var action = getDataAction(target);
            var options = cal.getOptions();
            var viewName = '';
            switch (action) {
                case 'toggle-daily':
                    viewName = 'day';
                    break;
                case 'toggle-weekly':
                    viewName = 'week';
                    break;
                case 'toggle-monthly':
                    options.month.visibleWeeksCount = 0;
                    viewName = 'month';
                    break;
                case 'toggle-weeks2':
                    options.month.visibleWeeksCount = 2;
                    viewName = 'month';
                    break;
                case 'toggle-weeks3':
                    options.month.visibleWeeksCount = 3;
                    viewName = 'month';
                    break;
                case 'toggle-narrow-weekend':
                    options.month.narrowWeekend = !options.month.narrowWeekend;
                    options.week.narrowWeekend = !options.week.narrowWeekend;
                    viewName = cal.getViewName();

                    target.querySelector('input').checked = options.month.narrowWeekend;
                    break;
                case 'toggle-start-day-1':
                    options.month.startDayOfWeek = options.month.startDayOfWeek ? 0 : 1;
                    options.week.startDayOfWeek = options.week.startDayOfWeek ? 0 : 1;
                    viewName = cal.getViewName();

                    target.querySelector('input').checked = options.month.startDayOfWeek;
                    break;
                case 'toggle-workweek':
                    options.month.workweek = !options.month.workweek;
                    options.week.workweek = !options.week.workweek;
                    viewName = cal.getViewName();

                    target.querySelector('input').checked = !options.month.workweek;
                    break;
                default:
                    break;
            }
            cal.setOptions(options, true);
            cal.changeView(viewName, true);
            setDropdownCalendarType();
            setRenderRangeText();
        }

        function mergeSchedule(e) {
            for (var i = 0; i < Object.keys(e.changes).length; i++) {
                e.schedule[Object.keys(e.changes)[i]] = e.changes[Object.keys(e.changes)[i]];
            }
        }

        function onClickNavi(e) {
            var action = getDataAction(e.target);
            switch (action) {
                case 'move-prev':
                    cal.prev();
                    break;
                case 'move-next':
                    cal.next();
                    break;
                case 'move-today':
                    cal.today();
                    break;
                default:
                    return;
            }
            setRenderRangeText();
        }

        function onNewSchedule() {
            var title = $('#new-schedule-title').val();
            var location = $('#new-schedule-location').val();
            var isAllDay = document.getElementById('new-schedule-allday').checked;
            var start = datePicker.getStartDate();
            var end = datePicker.getEndDate();
            var calendar = selectedCalendar ? selectedCalendar : CalendarList[0];
            if (!title) {
                return;
            }
            cal.createSchedules([{
                id: String(chance.guid()),
                calendarId: calendar.id,
                title: title,
                isAllDay: isAllDay,
                start: start,
                end: end,
                category: isAllDay ? 'allday' : 'time',
                dueDateClass: '',
                color: calendar.color,
                bgColor: calendar.bgColor,
                dragBgColor: calendar.bgColor,
                borderColor: calendar.borderColor,
                raw: {
                    location: location
                },
                state: 'Busy'
            }]);
            // here
            $('#modal-new-schedule').modal('hide');
        }

        function exportCalendar() {
            var siteName = _spPageContextInfo.webAbsoluteUrl.slice(_spPageContextInfo.webAbsoluteUrl.lastIndexOf('/') + 1);
            ExportHailStorm('calendar', _spPageContextInfo.webAbsoluteUrl,'{52A3665F-1252-430D-BACA-592801A01B99}', siteName, 'Calendar', '/sites/' + siteName + '/Lists/Calendar','','/sites/' + siteName + '/Lists/Calendar');
            return false;
        }

        function onChangeNewScheduleCalendar(e) {
            var target = $(e.target).closest('a[role="menuitem"]')[0];
            var calendarId = getDataAction(target);
            changeNewScheduleCalendar(calendarId);
        }

        function changeNewScheduleCalendar(calendarId) {
            var calendarNameElement = document.getElementById('calendarName');
            var calendar = findCalendar(calendarId);
            var html = [];
            html.push('<span class="calendar-bar" style="background-color: ' + calendar.bgColor + '; border-color:' + calendar.borderColor + ';"></span>');
            html.push('<span class="calendar-name">' + calendar.name + '</span>');
            calendarNameElement.innerHTML = html.join('');
            selectedCalendar = calendar;
        }

        function createNewSchedule(event) {
            var start = event.start ? new Date(event.start.getTime()) : new Date();
            var end = event.end ? new Date(event.end.getTime()) : moment().add(1, 'hours').toDate();
            if (useCreationPopup) {
                cal.openCreationPopup({
                    start: start,
                    end: end
                });
            }
        }

        function saveNewSchedule(scheduleData) {
            var calendar = scheduleData.calendar || findCalendar(scheduleData.calendarId);
            var attachments = [];
            var attachmentsList = document.getElementById(ElementPrefix + 'input-attachment').files;
            var dateA = scheduleData.start.getDate() + scheduleData.start.getMonth() + scheduleData.start.getFullYear();
            var dateB = scheduleData.end.getDate() + scheduleData.end.getMonth() + scheduleData.end.getFullYear();
            var isAllDay = dateA !== dateB ? true : (scheduleData.isAllDay ? true : false);
            if (!!attachmentsList.length) {
                for (var i = 0; i < attachmentsList.length; i++) {
                    attachments.push(attachmentsList[i].name);
                }
            }
            var schedule = {
                id: String(chance.guid()),
                spId: 2, // here
                comments: scheduleData.comments,
                title: scheduleData.title,
                isAllDay: isAllDay,
                start: scheduleData.start,
                end: scheduleData.end,
                category: isAllDay ? 'allday' : 'time',
                dueDateClass: '',
                color: calendar.color,
                bgColor: calendar.bgColor,
                dragBgColor: calendar.bgColor,
                borderColor: calendar.borderColor,
                attachments: attachments,
                // location: scheduleData.location,
                raw: {
                    class: scheduleData.raw['class']
                }
                // state: scheduleData.state,
            };
            if (calendar) {
                schedule.calendarId = calendar.id;
                schedule.color = calendar.color;
                schedule.bgColor = calendar.bgColor;
                schedule.borderColor = calendar.borderColor;
            }

            // var spSchedule = {
            //     Title: scheduleData.title,
            //     EndDate: moment(scheduleData.end._date).format('YYYY-MM-DDT[00:00:00Z]'),
            //     EventDate: moment(scheduleData.start._date).format('YYYY-MM-DDT[00:00:00Z]'),
            //     Location: scheduleData.location,
            //     Category: 'Meeting',
            //     fAllDayEvent: scheduleData.isAllDay,
            //     fRecurrence: false,
            //     bgColor: calendar.bgColor,
            //     borderColor: calendar.borderColor,
            //     calendarId: calendar.id,
            //     categoryType: scheduleData.isAllDay ? 'allday' : 'time',
            //     color: calendar.color,
            //     dragBgColor: calendar.bgColor,
            //     dueDateClass: '', 
            //     end: String(scheduleData.end._date.getTime()),
            //     idChance: String(chance.guid()),
            //     isAllDay: String(scheduleData.isAllDay),
            //     // locationTask: scheduleData.location,
            //     raw: JSON.stringify({class: scheduleData.raw['class']}),
            //     start: String(scheduleData.start._date.getTime()),
            //     // state: scheduleData.state,
            //     title0: scheduleData.title,
            //     __metadata: {
            //         type: 'SP.Data.CalendarListItem'
            //     }
            // };
            // here
            console.log(schedule);
            cal.createSchedules([schedule]);
            // saveSchedule(spSchedule);
            refreshScheduleVisibility();
        }

        function onChangeCalendars(e) {
            var calendarId = e.target.value;
            var checked = e.target.checked;
            var viewAll = document.querySelectorAll('.lnb-calendars-item input');
            var calendarElements = Array.prototype.slice.call(document.querySelectorAll('#calendarList input'));
            var allCheckedCalendars = true;
            if (calendarId === 'all') {
                allCheckedCalendars = checked;
                calendarElements.forEach(function(input) {
                    var span = input.parentNode;
                    input.checked = checked;
                    span.style.backgroundColor = checked ? span.style.borderColor : 'transparent';
                });
                CalendarList.forEach(function(calendar) {
                    calendar.checked = checked;
                });
            } else {
                findCalendar(calendarId).checked = checked;
                allCheckedCalendars = calendarElements.every(function(input) {
                    return input.checked;
                });
                if (allCheckedCalendars) {
                    viewAll.checked = true;
                } else {
                    viewAll.checked = false;
                }
            }
            refreshScheduleVisibility();
        }

        function refreshScheduleVisibility() {
            var calendarElements = Array.prototype.slice.call(document.querySelectorAll('#calendarList input'));
            CalendarList.forEach(function(calendar) {
                cal.toggleSchedules(calendar.id, !calendar.checked, false);
            });
            cal.render(true);
            calendarElements.forEach(function(input) {
                var span = input.nextElementSibling;
                span.style.backgroundColor = input.checked ? span.style.borderColor : 'transparent';
            });
        }

        function setDropdownCalendarType() {
            var calendarTypeName = document.getElementById('calendarTypeName');
            var calendarTypeIcon = document.getElementById('calendarTypeIcon');
            var options = cal.getOptions();
            var type = cal.getViewName();
            var iconClassName;
            if (type === 'day') {
                type = 'Daily';
                iconClassName = 'calendar-icon ic_view_day';
            } else if (type === 'week') {
                type = 'Weekly';
                iconClassName = 'calendar-icon ic_view_week';
            } else if (options.month.visibleWeeksCount === 2) {
                type = '2 weeks';
                iconClassName = 'calendar-icon ic_view_week';
            } else if (options.month.visibleWeeksCount === 3) {
                type = '3 weeks';
                iconClassName = 'calendar-icon ic_view_week';
            } else {
                type = 'Monthly';
                iconClassName = 'calendar-icon ic_view_month';
            }
            calendarTypeName.innerHTML = type;
            calendarTypeIcon.className = iconClassName;
        }

        function setRenderRangeText() {
            var renderRange = document.getElementById('renderRange');
            var options = cal.getOptions();
            var viewName = cal.getViewName();
            var html = [];
            if (viewName === 'day') {
                html.push(moment(cal.getDate().getTime()).format('DD MMMM YYYY'));
            } else if (viewName === 'month' &&
                (!options.month.visibleWeeksCount || options.month.visibleWeeksCount > 4)) {
                html.push(moment(cal.getDate().getTime()).format('MMMM YYYY'));
            } else {
                html.push(moment(cal.getDateRangeStart().getTime()).format('DD MMM YYYY'));
                html.push(' - ');
                html.push(moment(cal.getDateRangeEnd().getTime()).format('DD MMM YYYY'));
            }
            renderRange.innerHTML = html.join('');
        }

        function triggerUpload() {
            document.getElementById(ElementPrefix + 'input-attachment').click();
        }

        function replaceIcon() {
            var a = $('#' + ElementPrefix + 'input-attachment').val() != "" ? " " + ElementPrefix + "ic-loaded" : " " + ElementPrefix + "ic-attachment";
            $('#' + ElementPrefix + 'schedule-attachment span').removeClass().addClass(ElementPrefix + 'icon' + a);
        }

        function prepareToUpdate(e) {
            var schedule = e.schedule;
            var comments = document.getElementById(ElementPrefix + 'schedule-comments').value;
            var isAllDay = document.getElementById(ElementPrefix + 'schedule-allday').checked;
            var newAttachments = document.getElementById(ElementPrefix + 'input-attachment').files;
            if (schedule.comments !== '' && comments === '') {
                if (!e.changes) {
                    e.changes = {};
                }
                e.changes["comments"] = comments;
            }
            if (schedule.isAllDay === true && isAllDay === false) {
                if (!e.changes) {
                    e.changes = {};
                }
                e.changes["isAllDay"] = false;
                schedule.category = 'time';
            }
            if (!!newAttachments.length) {
                if (!!schedule.attachments.length) {
                    for (var i = 0; i < newAttachments.length; i++) {
                        if (schedule.attachments.indexOf(newAttachments[i].name) == -1) {
                            schedule.attachments.push(newAttachments[i].name);
                        }
                    }
                } else {
                    for (var i = 0; i < newAttachments.length; i++) {
                        schedule.attachments.push(newAttachments[i].name);
                    }
                }
            }
            cal.updateSchedule(schedule.id, schedule.calendarId, e.changes);
            refreshScheduleVisibility();
            if (!!e.changes) {
                mergeSchedule(e);
            }
        }

        function setEventListener() {
            $('#exportToOutlook').on('click', exportCalendar);
            $('#menu-navi').on('click', onClickNavi);
            $('.dropdown-menu a[role="menuitem"]').on('click', onClickMenu);
            $('#lnb-calendars').on('change', onChangeCalendars);
            $('#btn-save-schedule').on('click', onNewSchedule);
            $('#btn-new-schedule').on('click', createNewSchedule);
            $('#dropdownMenu-calendars-list').on('click', onChangeNewScheduleCalendar);
            $('#ifadCalendar').on('click', '#' + ElementPrefix + 'schedule-attachment', triggerUpload);
            $('#ifadCalendar').on('change', '#' + ElementPrefix + 'input-attachment', replaceIcon);
            window.addEventListener('resize', resizeThrottled);
        }

        function getDataAction(target) {
            return target.dataset ? target.dataset.action : target.getAttribute('data-action');
        }

        resizeThrottled = tui.util.throttle(function() {
            cal.render();
        }, 50);
        window.cal = cal;

        setDropdownCalendarType();
        setRenderRangeText();
        setEventListener();
    };

    function createCalendarMenu() {
        var calendarList = document.getElementById('calendarList');
        var html = [];
        CalendarList.forEach(function(calendar) {
            html.push('<div class="lnb-calendars-item"><label>' +
                '<input type="checkbox" class="' + ElementPrefix + 'checkbox-round" value="' + calendar.id + '" checked>' +
                '<span style="border-color: ' + calendar.borderColor + '; background-color: ' + calendar.borderColor + ';"></span>' +
                '<span>' + calendar.name + '</span>' +
                '</label></div>'
            );
        });
        calendarList.innerHTML = html.join('\n');
    };
// })();