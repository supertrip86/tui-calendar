/**
 * @fileoverview Controller mixin for Month View
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var util = global.tui.util,
    mmax = Math.max;

var array = require('../../common/array'),
    datetime = require('../../common/datetime'),
    Collection = require('../../common/collection');

var Month = {
    /**
     * Function for group each type of events in view model collection
     * @param {CalEventViewModel} viewModel - event view model
     * @returns {boolean} whether model is allday event?
     */
    _groupByType: function(viewModel) {
        return (viewModel.model.isAllDay ? 'allday' : 'time');
    },

    /**
     * Filter function for find time event
     * @param {CalEventViewModel} viewModel - event view model
     * @returns {boolean} whether model is time event?
     */
    _onlyTimeFilter: function(viewModel) {
        return !viewModel.model.isAllDay;
    },

    /**
     * Filter function for find allday event
     * @param {CalEventViewModel} viewModel - event view model
     * @returns {boolean} whether model is allday event?
     */
    _onlyAlldayFilter: function(viewModel) {
        return viewModel.model.isAllDay;
    },

    /**
     * Weight top value +1 for month view render
     * @param {CalEventViewModel} viewModel - event view model
     */
    _weightTopValue: function(viewModel) {
        viewModel.top += 1;
    },

    /**
     * Adjust render range to render properly.
     *
     * Limit starts, ends for each allday events and expand starts, ends for 
     * each time events
     * @this Base
     * @param {Date} starts - render start date
     * @param {Date} ends - render end date
     * @param {Collection} vColl - view model collection
     * @returns {Collection} collection with adjusted `renderStart`, `renderEnd`
     * property.
     */
    _adjustRenderRange: function(starts, ends, vColl) {
        var ctrlCore = this.Core;

        vColl.each(function(viewModel) {
            var eventDate;

            if (viewModel.model.isAllDay) {
                ctrlCore.limitRenderRange(starts, ends, viewModel);
            } else {
                eventDate = new Date(+viewModel.getStarts());
                viewModel.renderStart = datetime.start(eventDate);
                viewModel.renderEnd = datetime.end(eventDate)
            }
        });

        return vColl;
    },

    /**
     * Get max top index value for allday events in specific date (YMD)
     * @this Base
     * @param {string} ymd - yyyymmdd formatted value
     * @param {Collection} vAlldayColl - collection of allday events
     * @returns {number} max top index value in date
     */
    _getAlldayMaxTopIndexAtYMD: function(ymd, vAlldayColl) {
        var dateMatrix = this.dateMatrix,
            topIndexesInDate = [];

        util.forEach(dateMatrix[ymd], function(cid) {
            vAlldayColl.doWhenHas(cid, function(viewModel) {
                topIndexesInDate.push(viewModel.top);
            });
        });

        return mmax.apply(null, topIndexesInDate);
    },

    /**
     * Adjust time view model's top index value
     * @this Base
     * @param {Collection} vColl - collection of events
     */
    _adjustTimeTopIndex: function(vColl) {
        var ctrlMonth = this.Month,
            getAlldayMaxTopIndexAtYMD = ctrlMonth._getAlldayMaxTopIndexAtYMD,
            vAlldayColl = vColl.find(ctrlMonth._onlyAlldayFilter),
            maxIndexInYMD = {};

        vColl
            .find(ctrlMonth._onlyTimeFilter)
            .each(function(timeViewModel) {
                var eventYMD = datetime.format(timeViewModel.getStarts(), 'YYYYMMDD'),
                    alldayMaxTopInYMD = maxIndexInYMD[eventYMD];

                if (util.isUndefined(alldayMaxTopInYMD)) {
                    alldayMaxTopInYMD = maxIndexInYMD[eventYMD] =
                        getAlldayMaxTopIndexAtYMD(eventYMD, vAlldayColl);
                }

                maxIndexInYMD[eventYMD] = timeViewModel.top =
                    (alldayMaxTopInYMD + 1);

                if (timeViewModel.top > alldayMaxTopInYMD) {
                    return;
                }
            });
    },

    /**
     * Find event and get view model for specific month
     * @this Base
     * @param {Date} starts - start date to find events
     * @param {Date} ends - end date to find events
     * @param {function} [andFilter] - additional filter to AND clause
     * @returns {object} view model data
     */
    findByDateRange: function(starts, ends, andFilter) {
        var ctrlCore = this.Core,
            ctrlMonth = this.Month,
            filters = [],
            coll, vColl, vList,
            collisionGroup,
            matrices;

        filters.push(ctrlCore.getEventInDateRangeFilter(starts, ends));

        if (andFilter) {
            filters.concat(andFilter);
        }

        coll = this.events.find(Collection.and.apply(null, filters));
        vColl = ctrlCore.convertToViewModel(coll);
        vColl = ctrlMonth._adjustRenderRange(starts, ends, vColl);
        vList = vColl.sort(array.compare.event.asc);

        collisionGroup = ctrlCore.getCollisionGroup(vList);
        matrices = ctrlCore.getMatrices(vColl, collisionGroup);

        ctrlCore.positionViewModels(starts, ends, matrices, ctrlMonth._weightTopValue); 
        ctrlMonth._adjustTimeTopIndex(vColl);

        return matrices;
    }
};

module.exports = Month;

