(function ($, _) {

  /* Build UI (non-table stuff) */
  var headers = ['ID', 'First', 'Last', 'Team', 'Position', 'Average +/-', 'Min +/-', 'Max +/-', 'Minutes', 'Games'];
  var filters = ['Average +/-', 'Min +/-', 'Max +/-', 'Minutes', 'Games'];

  headers.forEach(function (h) {
    $('<th />')
      .text(h)
      .appendTo($('.stats-table thead > tr'));
  });

  filters.forEach(function (f) {
    var $fl = $('<div>')
      .addClass('filter--line')
      .appendTo($('.filters'));

    $('<span>')
      .addClass('filter--text')
      .text(f)
      .appendTo($fl);

    var i = f.indexOf(' ') === -1 ? f.length : f.indexOf(' ');

    $('<input />')
      .addClass('filter--filter filter--' + f.slice(0, i))
      .attr('type', 'number')
      .on('change', function () {
        console.log('change');
        table.draw();
      })
      .appendTo($fl);
  });

  /* Build Table */
  var height = $(window).height() - 200; // 100 padding plus 100 headers and footers

  var table = $('.stats-table').DataTable({
    processing: true,
    ajax: 'data/aggregate.json',
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
        data: 'minutesPlayed',
        render: function (data) {
          return Math.round(data * 100) / 100;
        },
      },
      { data: 'gamesPlayed' },
    ],
    iDisplayLength: 25,
    order: [[5, 'desc']],
  });

  /* Filter function */
  $.fn.dataTable.ext.search.push(
    function (settings, data, dataIndex) {
      var min = $('.filter--Games').val();
      var max = 82;
      var games = parseFloat(data[9]) || 0; // using the data from the 4th column

      if ((isNaN(min) && isNaN(max)) ||
           (isNaN(min) && games <= max) ||
           (min <= games   && isNaN(max)) ||
           (min <= games   && games <= max))
      {
        return true;
      }

      return false;
    }
  );
})($, _);
