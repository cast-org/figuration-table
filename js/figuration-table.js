/**
 * --------------------------------------------------------------------------
 * Figuration Table (v0.0.1): figuration-table.js
 * Licensed under MIT (https://github.com/cast-org/figuration-table/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */
/* globals JSON */

(function($) {
    'use strict';

    var CFW_Widget_Table = function(element, options) {
        this.element = element;
        this.$element = $(element);
        this.$active = null;
        this.$editor = null;
        this.$sorter = null;
        this.instance = null;
        this.selectors = CFW_Widget_Table.SELECTORS;

        var parsedData = this.$element.CFW_parseData('table', CFW_Widget_Table.DEFAULTS);
        this.settings = $.extend({}, CFW_Widget_Table.DEFAULTS, parsedData, options);

        this._init();
    };

    CFW_Widget_Table.DEFAULTS = {
        sortable: false,
        editable: false,
        coledit: false,
        json: null,
        editor: '<input type="text">',
        editorProps: [
            'font',
            'font-size',
            'font-family',
            'font-weight',
            'line-height',
            // 'text-align', // Input should use default alignment
            'padding',
            'padding-top',
            'padding-bottom',
            'padding-left',
            'padding-right',
            'border',
            'border-top',
            'border-bottom',
            'border-left',
            'border-right'
        ]
    };

    CFW_Widget_Table.SELECTORS = {
        headRow:    'thead tr',
        headCols:   'thead th',
        headCells:  'th',
        headSort:   'thead th .sort-icon',
        bodyElm:    'tbody',
        bodyRows:   'tbody tr',
        bodyCells:  'tbody td',
        rowElm:     'tr',
        rowCells:   'td'
    };

    $.fn.CFW_Table_JSON = function() {
        var $table = $(this);

        // Get column headers
        var headerData = [];
        var $cols = $table.find('thead th');
        var countCol = $cols.length;

        for (var i = 0; i < countCol; i++) {
            headerData[i] = $.trim($cols.eq(i).text());
        }

        // Get cells
        var bodyData = [];
        var $rows = $table.find('tbody tr');
        var countRow = $rows.length;

        for (i = 0; i < countRow; i++) {
            var rowData = [];
            var $cells = $rows.eq(i).find('td');
            for (var j = 0; j < countCol; j++) {
                rowData[j] = $.trim($cells.eq(j).text());
            }
            bodyData.push(rowData);
        }

        var tableData = {
            'header': headerData,
            'rows': bodyData
        };

        var json = JSON.stringify(tableData);
        return json;
    };

    CFW_Widget_Table.prototype = {
        _init : function() {
            this.instance = this.$element.CFW_getID('cfw-table');
            this.$element.addClass('figuration-table');

            if (this.settings.json !== null) {
                this.jsonInput(this.settings.json);
            }
            if (this.settings.editable) {
                this.editEnable();
            }
            if (this.settings.coledit) {
                this.colEditEnable();
            }
            if (this.settings.sortable) {
                this.sortEnable();
            }

            this.$element.CFW_trigger('init.cfw.table');
        },

        insertRow : function(index) {
            var $selfRef = this;

            if (!this.$element.CFW_trigger('beforeInsertRow.cfw.table')) {
                return;
            }

            if (index == null) { index = -1; }  // Assume append to end

            // Get count of columns (largest value)
            var $rows = this.$element.find(this.selectors.bodyRows);
            var count = Math.max.apply(null, $rows.map(function() {
                    return $(this).find($selfRef.selectors.rowCells).length;
                }).get());

            var row = this.$element.find(this.selectors.bodyElm)[0].insertRow(index);
            for (var i = 0; i < count; i++) {
                var cell = row.insertCell(i);
                this._updateCell(cell);
            }

            this.$element.CFW_trigger('afterInsertRow.cfw.table');
        },

        deleteRow : function(index) {
            if (!this.$element.CFW_trigger('beforeDeleteRow.cfw.table')) {
                return;
            }

            if (index == null) { index = -1; }  // Assume remove from end

            // Do not delete all rows
            var $rows = this.$element.find(this.selectors.bodyRows);
            if ($rows.length > 1) {
                this.element.deleteRow(index);
            }

            this.$element.CFW_trigger('afterDeleteRow.cfw.table');
        },

        appendCol : function(index) {
            if (!this.$element.CFW_trigger('beforeAppendCol.cfw.table')) {
                return;
            }

            if (index == null) { index = -1; }  // Assume append to end

            // Add cell to header
            var header = this.$element.find(this.selectors.headRow)[0];
            var cell = document.createElement('th');
            if (index == -1) {
                header.appendChild(cell);
            } else {
                var node = this.$element.find(this.selectors.headCols).get(index);
                header.insertBefore(cell, node);
            }

            // Add cell to each row
            var $rows = this.$element.find(this.selectors.bodyRows);
            var count = $rows.length;
            for (var i = 0; i < count; i++) {
                this._updateCell($rows[i].insertCell(index));
            }

            if (this.settings.sortable) {
                this._sortUpdate();
            }

            this.$element.CFW_trigger('afterAppendCol.cfw.table');
        },

        removeCol : function(index) {
            if (!this.$element.CFW_trigger('beforeRemoveCol.cfw.table')) {
                return;
            }

            if (index == null) { index = -1; }  // Assume remove from end

            // Do not delete all cols
            var $cols = this.$element.find(this.selectors.headCols);
            if ($cols.length > 1) {
                // Remove cell from header
                var header = this.$element.find(this.selectors.headRow)[0];
                header.deleteCell(index);

                // Remove cell from each row
                var $rows = this.$element.find(this.selectors.bodyRows);
                var count = $rows.length;
                for (var i = 0; i < count; i++) {
                    $rows[i].deleteCell(index);
                }
            }

            if (this.settings.sortable) {
                this._sortUpdate();
            }

            this.$element.CFW_trigger('afterRemoveCol.cfw.table');
        },

        _updateCells : function() {
            var $selfRef = this;
            var $cells = this.$element.find(this.selectors.rowCells);

            // Walk cells
            $.each($cells, function() {
                var $this = $(this);
                $selfRef._updateCell($this);
            });
        },

        _resetCell : function($node) {
            $node
                .removeAttr('tabindex')
                .removeClass('text-right');
        },

        _updateCell : function(node) {
            var $node = $(node);
            var content = $.trim($node.text());
            $node.text(content);

            this._resetCell($node);

            // Align right if numeric
            if ($.isNumeric(content)) {
                $node.addClass('text-right');
            }

            if (this.settings.editable) {
                $node.attr('tabindex', 0);
            }
        },

        _showEditor : function() {
            if (!this.settings.editable && !this.settings.coledit) { return; }
            this.$active = this.$element.find('td:focus, th:focus');
            if (this.$active.length) {
                this._editorCreate(this.$active);
                // this.$editor.select();
            }
        },

        _actionKeydown : function(e) {
            // For later reference:
            // 27-esc, 32-space, 33-pgup, 34-pgdn, 35-end, 36-home

            // 13-enter, 37-left, 38-up, 39-right, 40-down
            if (!/(13|37|38|39|40)/.test(e.which)) { return; }

            e.stopPropagation();
            e.preventDefault();

            if (e.which == 13) { // Enter
                this._showEditor();
                return;
            }

            var $keyTarget = this._actionMove(e);
            if ($keyTarget && $keyTarget.length > 0) {
                $keyTarget.focus();
            }
        },

        _actionMove : function(e) {
            // Keyboard navigation via arrow keys
            var $node = $(e.target);

            // Basic cell movement
            var $parent = $node.closest(this.selectors.rowElm); // Parent row
            var $prevRow = $parent.prev();
            var $nextRow = $parent.next();
            var selectorCells = this.selectors.rowCells;

            if (this.settings.sortable || this.settings.coledit) {
                selectorCells += ',' + this.selectors.headCells;

                var $rows = this.$element.find(this.selectors.rowElm);
                var count = $rows.length;

                for (var i = 0; i < count; i++) {
                    if ($rows.eq(i).is($parent)) {
                        $prevRow = i > 0     ? $rows.eq(i - 1) : null;
                        $nextRow = i < count ? $rows.eq(i + 1) : null;
                        break;
                    }
                }

                if (this.settings.sortable) {
                    if ($node.hasClass('sort-icon')) {
                        $node = $node.closest(this.selectors.headCells);
                    }
                }
            }

            switch (e.which) {
                /* Left  */ case 37: { return $node.prev(selectorCells).find('[tabindex=0]').addBack().filter('[tabindex=0]').first(); }
                /* Up    */ case 38: { return $prevRow.children().eq($node.index()).find('[tabindex=0]').addBack().filter('[tabindex=0]').first(); }
                /* Right */ case 39: { return $node.next(selectorCells).find('[tabindex=0]').addBack().filter('[tabindex=0]').first(); }
                /* Down  */ case 40: { return $nextRow.children().eq($node.index()).find('[tabindex=0]').addBack().filter('[tabindex=0]').first(); }
            }
        },

        _editorCreate : function($node) {
            var $selfRef = this;

            if (!this.$element.CFW_trigger('beforeShowEditor.cfw.table')) {
                return;
            }

            this.$editor = $(this.settings.editor)
                .val($node.text())
                .addClass('figuration-table-editor')
                .css($node.css(this.settings.editorProps))
                .data('cfw.table', this)
                .appendTo('body');

            this._editorPosition();

            this.$editor.trigger('focus');
            $(window).on('resize.cfw.table' + this.instance, $.proxy(this._editorPosition, this));

            this.$editor
                .on('blur.cfw.table', function() {
                    $selfRef.editorSave();
                })
                .on('keydown.cfw.table', function(e) {
                    $selfRef.editorKeydown(e);
                })
                .on('input.cfw.table paste.cfw.table', function() {
                    var evt = $.Event('validate.cfw.table');
                    evt = $.extend({}, evt, { value: $selfRef.$editor.val() });
                    $selfRef.$active.trigger(evt);
                    if (evt.result === false) {
                        $selfRef.$editor.addClass('error');
                    } else {
                        $selfRef.$editor.removeClass('error');
                    }
                });

            this.$element.CFW_trigger('afterShowEditor.cfw.table', { editor: this.$editor[0] });
        },

        _editorPosition : function() {
            if (this.$editor.is(':visible')) {
                this.$editor.offset(this.$active.offset())
                    .width(this.$active.width())
                    .height(this.$active.height());
            }
        },

        _editorRemove : function() {
            if (this.$editor == null) { return; }

            if (!this.$element.CFW_trigger('beforeHideEditor.cfw.table', { editor: this.$editor[0] })) {
                return;
            }

            $(window).off('resize.cfw.table' + this.instance);
            this.$editor && this.$editor.removeData('cfw.table').remove();
            this.$editor = null;
            this.$active = null;

            this.$element.CFW_trigger('afterHideEditor.cfw.table');
        },

        editorSave : function() {
            this._setActiveValue();
            this._editorRemove();
        },

        editorCancel : function() {
            this.$editor.val(this.$active.text());
        },

        editorKeydown : function(e) {
            // `focus` change event will trigger `blur` event handler

            // 37-left, 38-up, 39-right, 40-down
            if (/(37|38|39|40)/.test(e.which)) {
                // Allow for arrow key movement without changing cell
                e.stopPropagation();
                return;
            }

            // 9-tab, 13-enter, 27-esc
            if (!/(9|13|27)/.test(e.which)) { return; }

            if (e.which == 9) { // Tab - use new value
                this.$active.trigger('focus');
                // Pass through the tab keypress
                return;
            }

            if (e.which == 13) { // Enter - use new value
                e.stopPropagation();
                e.preventDefault();
                this.$active.trigger('focus');
            }
            if (e.which == 27) { // Esc - use original value
                e.stopPropagation();
                e.preventDefault();
                this.editorCancel();
                this.$active.trigger('focus');
            }
        },

        _setActiveValue : function() {
            if (this.$editor == null) { return; }

            var newVal = this.$editor.val();
            var origVal = this.$active.html();

            if (this.$active.text() === newVal || this.$editor.hasClass('error')) {
                return true;
            }

            var evt = $.Event('change.cfw.table');
            evt = $.extend({}, evt, { value: newVal });
            this.$active.text(newVal).trigger(evt);
            if (evt.result === false) {
                this.$active.html(origVal);
            }

            if (this.$active.is(this.selectors.headCells)) {
                this._sortUpdate();
            } else {
                this._updateCell(this.$active);
            }
        },

        editEnable : function() {
            this.settings.editable = true;
            this.$element
                .off('click.cfw.table', this.selectors.rowCells)
                .on('click.cfw.table', this.selectors.rowCells, $.proxy(this._showEditor, this))
                .off('keydown.cfw.table', this.selectors.rowCells)
                .on('keydown.cfw.table', this.selectors.rowCells, $.proxy(this._actionKeydown, this))
                .addClass('editable');
            this._updateCells();
        },

        editDisable : function() {
            this.settings.editable = false;
            this.$element
                .off('click.cfw.table', this.selectors.rowCells)
                .off('keydown.cfw.table', this.selectors.rowCells)
                .removeClass('editable');
            this._updateCells();
        },

        // Borrowed and modified from:
        // http://stackoverflow.com/a/19947532
        // http://jsfiddle.net/Zhd2X/20/
        _sortSimple : function(index, asc) {
            if (!this.settings.sortable) { return; }

            if (asc === undefined) { asc = true; }

            function getCellValue(row, index) {
                return $(row).children('td').eq(index).html();
            }

            function comparer(index) {
                return function(a, b) {
                    var valA = getCellValue(a, index);
                    var valB = getCellValue(b, index);
                    // return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.localeCompare(valB);

                    // Set option `numeric: true` for string comparison
                    // Forcing 'en' locale/language for the time being
                    // Info: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
                    return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.localeCompare(valB, 'en', { numeric: true });
                };
            }

            this.$sorter = this.$element.find(this.selectors.headCols).eq(index);
            var $rows = this.$element.find(this.selectors.bodyRows);
            var ascData = this.$sorter.data('cfw.table.sortOrder');
            if (typeof ascData !== undefined) {
                asc = !ascData;
            }

            this.$sorter.data('cfw.table.sortOrder', asc);

            var rowArray = $rows.toArray().sort(comparer(index));
            var count = rowArray.length;
            if (!asc){ rowArray = rowArray.reverse(); }
            for (var i = 0; i < count; i++) {
                this.$element.find(this.selectors.bodyElm).append(rowArray[i]);
            }
            this._sortUpdate();
        },

        _sortUpdate : function() {
            var $heads = this.$element.find(this.selectors.headCols);
            var asc = this.$sorter && this.$sorter.data('cfw.table.sortOrder');

            var ascString = asc ? 'ascending' : 'descending';

            $heads
                .removeAttr('aria-sort')
                .removeData('cfw.table.sortOrder')
                .find('.sort-icon')
                    .removeClass('sort-ascending sort-descending');

            if (this.settings.sortable) {
                $.each($heads, function() {
                    var $this = $(this);
                    if (!$this.find('.sort-icon').length) {
                        var $icon = $('<a href="#" role="button" class="sort-icon" tabindex=0 aria-label="Change column sort order">');
                        $this.append($icon);
                    }
                });
            }

            if (!this.settings.coledit) {
                $heads.attr('tabindex', -1);
            }

            if (this.$sorter !== null) {
                var iconName = 'sort-' + ascString;
                this.$sorter
                    .attr('aria-sort', ascString)
                    .data('cfw.table.sortOrder', asc)
                    .find('.sort-icon')
                        .addClass(iconName);
            }
        },

        sortEnable : function() {
            var $selfRef = this;

            // if (this.settings.coledit) {
            //     this.colEditDisable();
            // }
            this.settings.sortable = true;

            this.$element
                .off('click.cfw.table', this.selectors.headSort)
                .on('click.cfw.table', this.selectors.headSort, function(e) {
                    if (e) { e.preventDefault(); }
                    var index = $(e.target).closest($selfRef.selectors.headCells).index();
                    $selfRef._sortSimple(index);
                })
                .off('keydown.cfw.table', this.selectors.headCols)
                .on('keydown.cfw.table', this.selectors.headCols, function(e) {
                    // 13-enter, 37-left, 38-up, 39-right, 40-down
                    if (!/(13|37|38|39|40)/.test(e.which)) { return; }

                    e.stopPropagation();
                    e.preventDefault();

                    if (e.which == 13) { // Enter
                        var index = $(e.target).closest($selfRef.selectors.headCells).index();
                        $selfRef._sortSimple(index);
                        return;
                    }

                    var $keyTarget = $selfRef._actionMove(e);
                    if ($keyTarget && $keyTarget.length > 0) {
                        $keyTarget.focus();
                    }
                })
                .addClass('sortable');
            this._sortUpdate();
        },

        sortDisable : function() {
            this.settings.sortable = false;
            this.$element
                .off('click.cfw.table', this.selectors.headSort)
                .off('keydown.cfw.table', this.selectors.headCols)
                .removeClass('sortable');
            this.$sorter = null;
            this._sortUpdate();
        },

        colEditEnable : function() {
            this.settings.coledit = true;

            var $heads = this.$element.find(this.selectors.headCols);
            $heads.attr('tabindex', 0);

            this.$element
                .off('click.cfw.table', this.selectors.headCols)
                .on('click.cfw.table', this.selectors.headCols, $.proxy(this._showEditor, this))
                .off('keydown.cfw.table', this.selectors.headCols)
                .on('keydown.cfw.table', this.selectors.headCols, $.proxy(this._actionKeydown, this));
        },

        colEditDisable : function() {
            this.settings.coledit = false;
            this.$element
                .off('click.cfw.table', this.selectors.headCols)
                .off('keydown.cfw.table', this.selectors.headCols);

            var $heads = this.$element.find(this.selectors.headCols);

            if (this.settings.sortable) {
                $heads.attr('tabindex', -1);
            } else {
                $heads.removeAttr('tabindex');
            }
        },

        _buildTable : function() {
            var $table = this.$element;

            var $tbody = $table.find('tbody');
            if (!$tbody.length) {
                $tbody = $(document.createElement('tbody')).appendTo($table);
            }

            var $thead = $table.find('thead');
            if (!$thead.length) {
                $thead = $(document.createElement('thead')).insertBefore($tbody);
            }

            // var $throw = $thead.find('tr');
            // if (!$throw.length) {
            //     $(document.createElement('tr')).appendTo($thead);
            // }
        },

        _buildColumns : function(json) {
            var $thead = this.$element.find('thead');
            var $row = $(document.createElement('tr'));
            var count = json.header.length;

            for (var i = 0; i < count; i++) {
                $row.append($('<th/>').text($.trim(json.header[i])));
            }
            $thead.append($row);
        },

        _buildRows : function(json) {
            var $tbody = this.$element.find('tbody');
            var count = json.rows.length;

            for (var i = 0; i < count; i++) {
                var rowData = json.rows[i];
                var $row = $(document.createElement('tr'));
                var colCount = rowData.length;

                for (var j = 0; j < colCount; j++) {
                    var cellVal = rowData[j];
                    if (cellVal == null) cellVal = '';
                    var $cell = $(document.createElement('td')).text(cellVal);
                    $row.append($cell);
                    this._updateCell($cell);
                }
                $tbody.append($row);
            }
        },

        jsonInput : function(json) {
            this._buildTable();
            this._buildColumns(json);
            this._buildRows(json);
        },

        dispose : function() {
            this._editorRemove();
            this.editDisable();
            this.sortDisable();
            this.colEditDisable();

            this.$element
                .removeClass('figuration-table')
                .off('.cfw.table')
                .removeData('cfw.table');

            this.element = null;
            this.$element = null;
            this.$active = null;
            this.$editor = null;
            this.$sorter = null;
            this.instance = null;
            this.selectors = null;
            this.settings = null;
        }
    };

    function Plugin(option) {
        var args = [].splice.call(arguments, 1);
        return this.each(function() {
            var $this = $(this);
            var data = $this.data('cfw.table');
            var options = typeof option === 'object' && option;

            if (!data && /dispose/.test(option)) {
                return false;
            }
            if (!data) {
                $this.data('cfw.table', (data = new CFW_Widget_Table(this, options)));
            }
            if (typeof option === 'string') {
                data[option].apply(data, args);
            }
        });
    }

    $.fn.CFW_Table = Plugin;
    $.fn.CFW_Table.Constructor = CFW_Widget_Table;

    // FIGURATION TABLE INIT
    // =====================
    $(window).ready(function() {
        if (typeof CFW_API === 'undefined' || CFW_API !== false) {
            $('[data-cfw="table"]').CFW_Table();
        }
    });

})(jQuery);
