/**
 * --------------------------------------------------------------------------
 * Figuration Table (v0.0.1): figuration-table.js
 * Licensed under MIT (https://github.com/cast-org/figuration-table/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

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
        editor: '<input type="text">',
        editorProps: [
            'font',
            'font-size',
            'font-family',
            'font-weight',
            'line-height',
            'text-align',
            'padding',
            'padding-top',
            'padding-bottom',
            'padding-left',
            'padding-right',
            'border',
            'border-top',
            'border-bottom',
            'border-left',
            'border-right',
            'box-shadow',
            'outline'
        ]
    };

    CFW_Widget_Table.SELECTORS = {
        headRow:    'thead tr',
        headCols:   'thead th',
        headCells:  'th',
        bodyElm:    'tbody',
        bodyRows:   'tbody tr',
        bodyCells:  'tbody td',
        rowElm:     'tr',
        rowCells:   'td'
    };


    CFW_Widget_Table.prototype = {
        _init : function() {
            this.instance = this.$element.CFW_getID('cfw-table');
            this.$element.addClass('figuration-table');

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
        },

        deleteRow : function(index) {
            if (index == null) { index = -1; }  // Assume remove from end

            // Do not delete all rows
            var $rows = this.$element.find(this.selectors.bodyRows);
            if ($rows.length > 1) {
                this.element.deleteRow(index);
            }
        },

        appendCol : function(index) {
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
        },

        removeCol : function(index) {
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

            this._resetCell($node);

            // Align right if numeric
            if ($.isNumeric($node.text())) {
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
            var $parent = $node.parent();   // Parent row
            var $prevRow = $parent.prev();
            var $nextRow = $parent.next();
            var selectorCells = this.selectors.rowCells;

            if (this.settings.sortable || this.settings.coledit) {
                selectorCells = selectorCells + ',' + this.selectors.headCells;
                var $rows = this.$element.find(this.selectors.rowElm);
                var count = $rows.length;

                for (var i = 0; i < count; i++) {
                    if ($rows.eq(i).is($parent)) {
                        $prevRow = i > 0     ? $rows.eq(i - 1) : null;
                        $nextRow = i < count ? $rows.eq(i + 1) : null;
                        break;
                    }
                }
            }

            switch (e.which) {
                /* Left  */ case 37: { return $node.prev(selectorCells); }
                /* Up    */ case 38: { return $prevRow.children().eq($node.index()); }
                /* Right */ case 39: { return $node.next(selectorCells); }
                /* Down  */ case 40: { return $nextRow.children().eq($node.index()); }
            }
        },

        _editorCreate : function($node) {
            var $selfRef = this;
            this.$editor = $(this.settings.editor)
                .val($node.text())
                .addClass('figuration-table-editor')
                .css($node.css(this.settings.editorProps))
                .appendTo('body');

            this._editorPosition();

            this.$editor.trigger('focus');
            $(window).on('resize.cfw.table' + this.instance, $.proxy(this._editorPosition, this));

            this.$editor
                .on('blur.cfw.table', function() {
                    $selfRef._setActiveValue();
                    $selfRef._editorRemove();
                })
                .on('keydown.cfw.table', function(e) {
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
                        $selfRef.$active.trigger('focus');
                        // Pass through the tab keypress
                        return;
                    }

                    if (e.which == 13) { // Enter - use new value
                        e.stopPropagation();
                        e.preventDefault();
                        $selfRef.$active.trigger('focus');
                    }
                    if (e.which == 27) { // Esc - use original value
                        e.stopPropagation();
                        e.preventDefault();
                        $selfRef.$editor.val($selfRef.$active.text());
                        $selfRef.$active.trigger('focus');
                    }
                })
                .on('input.cfw.table paste.cfw.table', function() {
                    var result = $selfRef.$active.CFW_trigger('validate.cfw.table', { value: $selfRef.$editor.val() });
                    if (result === false) {
                        $selfRef.$editor.addClass('error');
                    } else {
                        $selfRef.$editor.removeClass('error');
                    }
                });
        },

        _editorPosition : function() {
            if (this.$editor.is(':visible')) {
                this.$editor.offset(this.$active.offset())
                    .width(this.$active.width())
                    .height(this.$active.height());
            }
        },

        _editorRemove : function() {
            $(window).off('resize.cfw.table' + this.instance);
            this.$editor && this.$editor.remove();
            this.$editor = null;
            this.$active = null;
        },

        _setActiveValue : function() {
            var newVal = this.$editor.val();
            var origVal = this.$active.html();

            if (this.$active.text() === newVal || this.$editor.hasClass('error')) {
                return true;
            }

            var result = this.$active.text(newVal).CFW_trigger('change.cfw.table', { value: newVal });
            if (result === false) {
                this.$active.html(origVal);
            }
        },

        editEnable : function() {
            this.settings.editable = true;
            this.$element
                .on('click.cfw.table', this.selectors.rowCells, $.proxy(this._showEditor, this))
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
                    return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.localeCompare(valB);
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
                .removeClass('sort-icon sort-ascending sort-descending')
                .removeData('cfw.table.sortOrder');

            if (this.settings.sortable) {
                $heads
                    .attr('tabindex', 0)
                    .addClass('sort-icon');
            } else {
                $heads.removeAttr('tabindex');
            }

            if (this.$sorter !== null) {
                var icon = 'sort-' + ascString;
                this.$sorter
                    .addClass(icon)
                    .attr('aria-sort', ascString)
                    .data('cfw.table.sortOrder', asc);
            }
        },

        sortEnable : function() {
            var $selfRef = this;

            if (this.settings.coledit) {
                this.colEditDisable();
            }
            this.settings.sortable = true;

            this.$element
                .on('click.cfw.table', this.selectors.headCols, function(e) {
                    var index = $(e.target).index();
                    $selfRef._sortSimple(index);
                })
                .on('keydown.cfw.table', this.selectors.headCols, function(e) {
                    // 13-enter, 37-left, 38-up, 39-right, 40-down
                    if (!/(13|37|38|39|40)/.test(e.which)) { return; }

                    e.stopPropagation();
                    e.preventDefault();

                    if (e.which == 13) { // Enter
                        var index = $(e.target).index();
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
                .off('click.cfw.table', this.selectors.headCols)
                .off('keydown.cfw.table', this.selectors.headCols)
                .removeClass('sortable');
            this.$sorter = null;
            this._sortUpdate();
        },

        colEditEnable : function() {
            if (this.settings.sortable) {
                this.sortDisable();
            }
            this.settings.coledit = true;

            var $heads = this.$element.find(this.selectors.headCols);
            $heads.attr('tabindex', 0);

            this.$element
                .on('click.cfw.table', this.selectors.headCols, $.proxy(this._showEditor, this))
                .on('keydown.cfw.table', this.selectors.headCols, $.proxy(this._actionKeydown, this));
        },

        colEditDisable : function() {
            this.settings.coledit = false;
            this.$element
                .off('click.cfw.table', this.selectors.headCols)
                .off('keydown.cfw.table', this.selectors.headCols);

            var $heads = this.$element.find(this.selectors.headCols);
            $heads.removeAttr('tabindex');
        },

        dispose : function() {
            this._editorRemove();
            this.editDisable();
            this.sortDisable();

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
