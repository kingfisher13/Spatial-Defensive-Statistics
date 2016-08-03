(function ($, _) {

  var headers = ['ID', 'First', 'Last', 'Team', 'Position', 'Average +/-', 'Min +/-', 'Max +/-'];

  headers.forEach(function (h) {
    $('<th />')
      .text(h)
      .appendTo($('.stats-table thead > tr'));
  });

  $('.stats-table').DataTable({
    processing: true,
    ajax: 'data/aggregate.json',
    columns: [
      { data: 'playerid' },
      { data: 'firstname' },
      { data: 'lastname' },
      { data: 'team' },
      { data: 'position' },
      { data: 'stats.average' },
      { data: 'stats.min' },
      { data: 'stats.max' }
    ],
    iDisplayLength: 25,
    order: [[5, 'desc']]
  });
})($, _);
