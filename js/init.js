(function ($, _) {
  var DATA;
  var TABLE;
  var FILTERS = [['Average +/-', 'average'], ['Min +/-', 'min'], ['Max +/-', 'max'], ['Minutes', 'minutes'], ['Games', 'games']];

  $(document).ready(function () {
    $.getJSON('data/aggregate.json', function (data) {
      DATA = data;
      processData();
      buildTable();
      buildFilters();
      customEvents();
    });
  });

  function processData() {
    DATA.average = {
      min: Math.round(_.min(DATA.data, function (d) { return d.stats.average; }).stats.average),
      max: Math.round(_.max(DATA.data, function (d) { return d.stats.average; }).stats.average)
    };

    DATA.max = {
      min: Math.round(_.min(DATA.data, function (d) { return d.stats.max; }).stats.max),
      max: Math.round(_.max(DATA.data, function (d) { return d.stats.max; }).stats.max)
    };

    DATA.min = {
      min: Math.round(_.min(DATA.data, function (d) { return d.stats.min; }).stats.min),
      max: Math.round(_.max(DATA.data, function (d) { return d.stats.min; }).stats.min)
    };

    DATA.games = {
      min: Math.round(_.min(DATA.data, function (d) { return d.games; }).games),
      max: Math.round(_.max(DATA.data, function (d) { return d.games; }).games)
    };

    DATA.minutes = {
      min: Math.round(_.min(DATA.data, function (d) { return d.minutes; }).minutes),
      max: Math.round(_.max(DATA.data, function (d) { return d.minutes; }).minutes)
    };
  }

  /* Build Table */
  function buildTable() {
    /* Headers */
    var headers = ['ID', 'First', 'Last', 'Team', 'Position', 'Average +/-', 'Min +/-', 'Max +/-', 'Minutes', 'Games'];
    headers.forEach(function (h) {
      $('<th />')
        .text(h)
        .appendTo($('.stats-table thead > tr'));
    });

    /* Table itself */
    var height = $(window).height() - 200; // 100 padding plus 100 headers and footers

    TABLE = $('.stats-table').DataTable({
      processing: true,
      data: DATA.data,
      paging: false,
      scrollY: height,
      columns: [
        { data: 'playerid' },
        { data: 'firstname' },
        { data: 'lastname' },
        { data: 'team' },
        { data: 'position' },
        {
          data: 'stats.average',
          render: function (data) {
            return Math.round(data * 100) / 100;
          },
        },
        { data: 'stats.min' },
        { data: 'stats.max' },
        {
          data: 'minutes',
          render: function (data) {
            return Math.round(data * 100) / 100;
          },
        },
        { data: 'games' },
      ],
      iDisplayLength: 25,
      order: [[5, 'desc']],
    });
  }

  function buildFilters() {
    /* Filter UI */
    FILTERS.forEach(function (f) {
      $('<p>')
        .addClass('filter--text')
        .text(f[0])
        .appendTo($('.filters'));

      var $fl = $('<div>')
        .addClass('filter--line')
        .appendTo($('.filters'));

      var $slider = $('<div>')
        .addClass('filter--slider filter--' + f[1])
        .appendTo($fl);

      var min = DATA[f[1]].min;
      var max = DATA[f[1]].max;

      noUiSlider.create($slider[0], {
        start: [min, max],
        connect: true,
        range: {
          min: min,
          max: max
        },
        pips: {
          mode: 'positions',
          values: [0, 100],
          density: 4
        }
      });

      $slider[0].noUiSlider.on('change', TABLE.draw);
      $slider[0].noUiSlider.on('slide', updatePips);
      $slider[0].noUiSlider.on('set', updatePips);
      $slider[0].noUiSlider.on('set', TABLE.draw);
    });

    function updatePips(v, h, u, t, p) {
      var $pips = $('.noUi-pips', $(this.target));
      $pips.find('div:first-of-type').css('left', p[0] + '%');
      $pips.find('div:first-of-type').next().css('left', p[0] + '%').text(Math.round(u[0]));

      $pips.find('div:last-of-type').css('left', p[1] + '%').text(Math.round(u[1]));
      $pips.find('div:last-of-type').prev().css('left', p[1] + '%');
    }
  }

  function customEvents() {
    /* Filter function */
    $.fn.dataTable.ext.search.push(
      function (settings, data, dataIndex) {
        var keepRow = true;
        FILTERS.forEach(function (f, i) {
          var sliderVals = $('.filter--' + f[1])[0].noUiSlider.get();
          var columnData = parseFloat(data[i + 5]) || 0;

          if (parseFloat(sliderVals[0]) > columnData || columnData > parseFloat(sliderVals[1])) keepRow = false;
        });

        return keepRow;
      }
    );

    $('.filters--reset-link').on('click', function () {
      $('.filter--slider').each(function () {
        var slider = $(this)[0].noUiSlider;
        slider.set([slider.options.start[0], slider.options.start[1]]);
      });

    });
  }
})($, _);
