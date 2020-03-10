'use strict';

/* eslint-disable require-jsdoc */
/* eslint-env jquery */
/* global moment, tui, chance */

// (function IfadCalendar(){
    var ElementPrefix = 'tui-full-calendar-';
    var Calendar = tui.Calendar;
    var CalendarList = [];
    var Schedules = [];
    var CurrentSchedule = [];
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

    // SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function() {
        createCalendarList();
        createCalendar(window, Calendar);
        createCalendarMenu();
        // getSchedules();
    // });
    

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

    function findCalendar(id) {
        var found;
        CalendarList.forEach(function(calendar) {
            if (calendar.id === id) {
                found = calendar;
            }
        });
        return found || CalendarList[0];
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
            isReadOnly: false,
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
                CurrentSchedule.length = 0;
                CurrentSchedule.push(e.schedule);
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
                console.log(e);
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

        function prepareToUpdate(e) {
            var schedule = e.schedule;
            var comments = document.getElementById(ElementPrefix + 'schedule-comments') && document.getElementById(ElementPrefix + 'schedule-comments').value;
            var isAllDay = document.getElementById(ElementPrefix + 'schedule-allday') && document.getElementById(ElementPrefix + 'schedule-allday').checked;
            var newAttachments = document.getElementById(ElementPrefix + 'input-attachment') && document.getElementById(ElementPrefix + 'input-attachment').files;
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
            if (newAttachments && !!newAttachments.length) {
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
                for (var i = 0; i < Object.keys(e.changes).length; i++) {
                    e.schedule[Object.keys(e.changes)[i]] = e.changes[Object.keys(e.changes)[i]];
                }
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
            $('#ifadCalendar').on('change', '#' + ElementPrefix + 'input-attachment', attachmentsValidator);
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

    function attachmentsValidator() {
        var target = $(this)[0];
        var max = 5;
        var message = '';
        var existingFiles = [];
        var exceedingFiles = [];
        if (!!CurrentSchedule.length) {
            var schedule = CurrentSchedule[0];
            max -= schedule.attachments.length;
            if (target.files.length <= max && max > 0) {
                for (var i = 0; i < target.files.length; i++) {
                    if (schedule.attachments.indexOf(target.files[i].name) > -1) {
                        existingFiles.push(target.files[i].name);
                    }
                }
                if (existingFiles.length > 0) {
                    message = 'The following files have already been uploaded: ' + existingFiles.join();
                }
            }
        }
        if (target.files.length > max && max === 0) {
            message = 'No more files can be attached to this event';
        } else if (target.files.length > max && max > 0) {
            message = 'You can attach only ' + max + ' more files to this event, you selected ' + target.files.length;
        }
        // for (var d = 0; d < target.files.length; d++) {
        //     var currentSize = target.files[d].size
        //     // if (target.files[d].size )
        // }
        if (message.length > 0) {
            swal.fire({
                title: 'Warning',
                text: message,
                confirmButtonText: 'Ok',
                confirmButtonColor: '#3085d6',
                icon: 'warning'
            });
            $(this).val('');
        } else {
            $('.' + ElementPrefix + 'ic-attachment').addClass(ElementPrefix + 'ic-loaded');
            CurrentSchedule.length = 0;
        }
    };

    /* CRUD OPERATIONS via SharePoint REST API*/

    function formatSchedules(data) {
        for (var i = 0; i < data.length; i++) {
            var schedule = {};
            schedule['id'] = data[i].idChance;
            schedule['spID'] = data[i].Id;
            schedule['calendarId'] = data[i].calendarId;
            schedule['title'] = data[i].Title;
            schedule['isAllDay'] = (data[i].isAllDay == "true") ? true : false;
            schedule['start'] = parseInt(data[i].start);
            schedule['end'] = parseInt(data[i].end);
            schedule['category'] = (data[i].isAllDay == "true") ? 'allday' : 'time';
            schedule['dueDateClass'] = '';
            schedule['comments'] = data[i].comments ? data[i].comments : '';
            schedule['attachments'] = [];
            schedule['attachmentsUrl'] = 'https://xdesk.ifad.org/sites/opr/Lists/Calendar/Attachments/' + data[i].Id + '/';
            schedule['color'] = data[i].color;
            schedule['bgColor'] = data[i].bgColor;
            schedule['dragBgColor'] = data[i].dragBgColor;
            schedule['borderColor'] = data[i].borderColor;
            schedule['raw'] = JSON.parse(data[i].raw);
            if (data[i].Attachments) {
                for (var d = 0; d < data[i].AttachmentFiles.results.length; d++) {
                    schedule['attachments'].push(data[i].AttachmentFiles.results[d].FileName);
                }
            }
            Schedules.push(schedule);
        }
    }

    function formatSingleSchedule(item) {
        var schedule = {};
        schedule['id'] = item.idChance;
        schedule['spID'] = item.Id;
        schedule['calendarId'] = item.calendarId;
        schedule['title'] = item.Title;
        schedule['isAllDay'] = (item.isAllDay == "true") ? true : false;
        schedule['start'] = parseInt(item.start);
        schedule['end'] = parseInt(item.end);
        schedule['category'] = (item.isAllDay == "true") ? 'allday' : 'time';
        schedule['dueDateClass'] = '';
        schedule['comments'] = item.comments ? item.comments : '';
        schedule['attachments'] = [];
        schedule['attachmentsUrl'] = 'https://xdesk.ifad.org/sites/opr/Lists/Calendar/Attachments/' + (item.Id ? item.Id : 0) + '/';
        schedule['color'] = item.color;
        schedule['bgColor'] = item.bgColor;
        schedule['dragBgColor'] = item.dragBgColor;
        schedule['borderColor'] = item.borderColor;
        schedule['raw'] = JSON.parse(item.raw);
        if (item.Attachments) {
            for (var d = 0; d < item.AttachmentFiles.results.length; d++) {
                schedule['attachments'].push(item.AttachmentFiles.results[d].FileName);
            }
        }
        return schedule
    }

    function getSchedules() {
        var spRequest = new XMLHttpRequest();
        spRequest.open("GET", _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Calendar')/items?$expand=AttachmentFiles");
        spRequest.setRequestHeader("Accept","application/json; odata=verbose");
        spRequest.onreadystatechange = function() {
            if (spRequest.readyState === 4 && spRequest.status === 200) {
                var result = JSON.parse(spRequest.responseText);
                formatSchedules(result.d.results);
                cal.createSchedules(Schedules);
            }
            else if (spRequest.readyState === 4 && spRequest.status !== 200) { 
                console.log('lists not retrieved');
            }
        }
        spRequest.send();
    }

    function getSingleSchedule(id) {
        var spRequest = new XMLHttpRequest();
        spRequest.open("GET", _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Calendar')/items(" + id + ")?$expand=AttachmentFiles");
        spRequest.setRequestHeader("Accept","application/json; odata=verbose");
        spRequest.onreadystatechange = function() {
            if (spRequest.readyState === 4 && spRequest.status === 200) {
                var result = JSON.parse(spRequest.responseText);
                var schedule = formatSingleSchedule(result.d);
                cal.createSchedules([schedule]);
                refreshScheduleVisibility();
                $(".spinner").remove();
                $("#s4-workspace").removeClass("invisible");
            }
            else if (spRequest.readyState === 4 && spRequest.status !== 200) { 
                console.log('lists not retrieved');
            }
        }
        spRequest.send();
    }

    function saveNewSchedule(scheduleData) {
        var calendar = scheduleData.calendar || findCalendar(scheduleData.calendarId);
        if (calendar) {
            var attachments = [];
            var attachmentsList = document.getElementById(ElementPrefix + 'input-attachment').files;
            if (!!attachmentsList.length) {
                for (var i = 0; i < attachmentsList.length; i++) {
                    attachments.push(attachmentsList[i].name);
                }
            }
            var schedule = {
                Title: scheduleData.title,
                EndDate: moment(scheduleData.end._date).format('YYYY-MM-DDT[00:00:00Z]'),
                EventDate: moment(scheduleData.start._date).format('YYYY-MM-DDT[00:00:00Z]'),
                Category: 'Meeting',
                comments: scheduleData.comments,
                fAllDayEvent: scheduleData.isAllDay,
                fRecurrence: false,
                bgColor: calendar.bgColor,
                borderColor: calendar.borderColor,
                calendarId: calendar.id,
                categoryType: scheduleData.isAllDay ? 'allday' : 'time',
                color: calendar.color,
                dragBgColor: calendar.bgColor,
                dueDateClass: '', 
                end: String(scheduleData.end._date.getTime()),
                idChance: String(chance.guid()),
                isAllDay: String(scheduleData.isAllDay),
                raw: JSON.stringify({class: scheduleData.raw['class']}),
                start: String(scheduleData.start._date.getTime()),
                __metadata: {
                    type: 'SP.Data.CalendarListItem'
                }
            };
            cal.createSchedules([formatSingleSchedule(schedule)]);
            refreshScheduleVisibility();
            // saveScheduleInSp(schedule);

        }
    }

    function saveScheduleInSp(schedule) {
        $("#s4-workspace").addClass("invisible");
        $("body").append('<div class="spinner"></div>');
        $.ajax({
            url: _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Calendar')/items",
            type: "POST",
            contentType: "application/json;odata=verbose",
            data: JSON.stringify(schedule),
            headers: {
                "Accept": "application/json;odata=verbose",
                "X-RequestDigest": $("#__REQUESTDIGEST").val()
            }
        }).done(function(data){
            if ($("#" + ElementPrefix + "input-attachment") && !!$("#" + ElementPrefix + "input-attachment")[0].files.length) {
                AddAllAttachments(data.d.Id);
            }
            else {
                $(".spinner").remove();
                $("#s4-workspace").removeClass("invisible");
            }
        });
    }

    function AddAllAttachments(id) {
        var data = [];
        var fileArray = [];
        $.each($("#" + ElementPrefix + "input-attachment")[0].files, function() {
            fileArray.push({
                "Attachment": $(this)[0]
            });
        });
        data.push({
            "Files": fileArray
        });
        var createItemWithAttachments = function(listName, listValues, id) {
            var fileCountCheck = 0;
            var fileNames;
            var context = new SP.ClientContext.get_current();
            var dfd = $.Deferred();
            var targetList = context.get_web().get_lists().getByTitle(listName);
            context.load(targetList);
            var itemCreateInfo = new SP.ListItemCreationInformation();
            context.executeQueryAsync(
                function() {
                    if (listValues[0].Files.length !== 0) {
                        if (fileCountCheck <= listValues[0].Files.length - 1) {
                            loopFileUpload(listName, id, listValues, fileCountCheck);
                        }
                    } else {
                        dfd.resolve(fileCountCheck);
                    }
                },
                function(sender, args) {
                    throw new TypeError('Error occured' + args.get_message());
                });
            return dfd.promise();
        };
        createItemWithAttachments("Calendar", data, id);
    }

    function loopFileUpload(listName, id, listValues, fileCountCheck) {
        var dfd = $.Deferred();
        uploadFile(listName, id, listValues[0].Files[fileCountCheck].Attachment).then(
            function(data) {
                var objcontext = new SP.ClientContext();
                var targetList = objcontext.get_web().get_lists().getByTitle(listName);
                var listItem = targetList.getItemById(id);
                objcontext.load(listItem);
                objcontext.executeQueryAsync(function() {
                    fileCountCheck++;
                    if (fileCountCheck <= listValues[0].Files.length - 1) {
                        loopFileUpload(listName, id, listValues, fileCountCheck);
                    } else {
                        getSingleSchedule(id);
                    }
                },
                function(sender, args) {
                    throw new TypeError("Reload List Item - Fail" + args.get_message());
                });
            },
            function(sender, args) {
                throw new TypeError("Not uploaded");
                dfd.reject(sender, args);
            }
        );
        return dfd.promise();
    }

    function uploadFile(listName, id, file) {
        var deferred = $.Deferred();
        var fileName = file.name;
        getFileBuffer(file).then(
            function(buffer) {
                var bytes = new Uint8Array(buffer);
                var binary = '';
                for (var b = 0; b < bytes.length; b++) {
                    binary += String.fromCharCode(bytes[b]);
                }
                $.getScript("/_layouts/15/SP.RequestExecutor.js", function() {
                    var createitem = new SP.RequestExecutor(_spPageContextInfo.webServerRelativeUrl);
                    createitem.executeAsync({
                        url: _spPageContextInfo.webServerRelativeUrl + "/_api/web/lists/GetByTitle('" + listName + "')/items(" + id + ")/AttachmentFiles/add(FileName='" + file.name + "')",
                        method: "POST",
                        binaryStringRequestBody: true,
                        body: binary,
                        success: fsucc,
                        error: ferr,
                        state: "Update"
                    });

                    function fsucc(data) {
                        deferred.resolve(data);
                    }

                    function ferr(data) {
                        throw new TypeError(fileName + "not uploaded error");
                        deferred.reject(data);
                    }
                });
            },
            function(err) {
                deferred.reject(err);
            }
        );
        return deferred.promise();
    }

    function getFileBuffer(file) {
        var deferred = $.Deferred();
        var reader = new FileReader();
        reader.onload = function(e) {
            deferred.resolve(e.target.result);
        };
        reader.onerror = function(e) {
            deferred.reject(e.target.error);
        };
        reader.readAsArrayBuffer(file);
        return deferred.promise();
    }

// })();