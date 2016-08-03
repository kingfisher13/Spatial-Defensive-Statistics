var gameID = '0021500346'; //TEST data for now

var DATA;
var teamStyles = {
  ball: '#F5551B',
  IND: '#FFC633',
  DET: '#006BB6',
};
var gameDetails = {};
var animationDuration = 50;
var momentInterval;
var currentFrame = 0;

var spatialConfig = {
  possessionXYDistance: 20, //in pixels
  possessionZDistance: 7, //in feet
};

d3.queue()
  .defer(d3.json, 'data/' + gameID + '.simpleClosest.json')
  .await(function (error, data) {
    DATA = data;
    console.log(DATA);

    prepPlayerData();
    buildUI();
    drawCourt();
  });

function prepPlayerData() {
  var ball = [{ lastname: 'ball', playerid: -1, team: 'ball' }];

  DATA.players.home.map(function (p) {
    p.team = DATA.teams.home.abbreviation;
    p.name = p.firstname + ' ' + p.lastname;
  });

  DATA.players.visitor.map(function (p) {
    p.team = DATA.teams.visitor.abbreviation;
    p.name = p.firstname + ' ' + p.lastname;
  });

  DATA.allPlayers = ball.concat(DATA.players.home, DATA.players.visitor);
}

function buildUI() {
  var homeAbbr = DATA.teams.home.abbreviation;
  var awayAbbr = DATA.teams.visitor.abbreviation;

  //Title bar
  $('.title-bar--home')
    .css('color', teamStyles[homeAbbr])
    .text(DATA.teams.home.name);

  $('.title-bar--away')
    .css('color', teamStyles[awayAbbr])
    .text(DATA.teams.visitor.name);

  $('.game-date').text(DATA.gameDate);

  $('.score--home').addClass('score--' + DATA.teams.home.teamid);
  $('.score--visitor').addClass('score--' + DATA.teams.visitor.teamid);

  //Play Controls
  $('.play-controls--play').on('click', function () {
    runAnimation(currentFrame, DATA.gameData.length - 1);
  });

  $('.play-controls--pause').on('click', function () {
    clearTimeout(momentInterval);
  });

  $('.play-controls--reset').on('click', function () {
    clearTimeout(momentInterval);
    currentFrame = 0;
    $('.ratings---cell').text('');
  });

  $('.play-controls--forward').on('click', function () {
    runAnimation(currentFrame, currentFrame + 1);
  });

  $('.play-controls--back').on('click', function () {
    reverseAnimationOneFrame();
  });
}

function drawCourt() {
  var svgW = 940;
  var svgH = 500;
  var svg = d3.select('svg.court')
    .attr('width', svgW)
    .attr('height', svgH);

  svg.append('g')
    .append('svg:image')
    .attr('xlink:href', 'img/fullcourt.svg')
    .attr('width', svgW)
    .attr('height', svgH);

  $('.time-bar').width(svgW);
}

function runAnimation(start, end) {
  clearTimeout(momentInterval);

  var i = start;
  animationFrame(i);

  function animationFrame(i) {
    if (i !== end) {
      momentInterval = setTimeout(function () {
        update(DATA.gameData[i]);
        i++;
        currentFrame++;
        animationFrame(i);
      }, animationDuration);
    }
  }
}

function reverseAnimationOneFrame() {
  clearTimeout(momentInterval);

  currentFrame--;
  update(DATA.gameData[currentFrame], true);
}

function update(frame, noStatsUpdate) {
  //calculate new data
  var newPlayers = [];
  DATA.allPlayers.forEach(function (p) {
    frame[5].forEach(function (f) {
      if (f[1] === p.playerid) {
        var np = _.clone(p);
        np.x = f[2] * 10; //convert into pixel value
        np.y = f[3] * 10; //convert into pixel value
        np.z = f[4] || 0; //no need for pixel value as z axis isn't displayed
        newPlayers.push(np);
      }
    });
  });

  updatePlayerLocations(newPlayers);
  updatePlayerPossessionSpatially();
  updatePlayerDefensiveAssignment(frame);
  updateUIDetails(frame);
  if (frame[6].length != 0 && !noStatsUpdate) {
    $('.last-play').text(frame[6].playstring);
    updatePlusMinusAndScore(frame);
  }
}

function updatePlayerLocations(newPlayers) {
  var circles = d3.select('svg').selectAll('circle')
    .data(newPlayers, function (d) { return d.playerid; });

  circles.transition()
    .duration(animationDuration)
    .attr('cx', function (d) { return d.x; })
    .attr('cy', function (d) { return d.y; });

  circles.enter().append('circle')
    .attr('cx', function (d) { return d.x; })
    .attr('cy', function (d) { return d.y; })
    .attr('r', function (d) { return d.team === 'ball' ? 6 : 8; })
    .classed('ball', function (d) { return d.team === 'ball'; })
    .style('fill', function (d) {
      return teamStyles[d.team];
    })
    .style('stroke', '#666');

  circles.exit().remove();
}

function updatePlayerPossessionSpatially() {
  var ball = d3.selectAll('circle.ball').data()[0];

  //first time
  if (gameDetails.playerWithBall == undefined || gameDetails.teamPossession == -1) {
    var closest = 9999;
    d3.selectAll('circle:not(.ball)').each(function (d) {
      if (distanceBetween(ball, d) < closest) {
        gameDetails.playerWithBall = d;
        gameDetails.teamPossession = d.team;
        closest = distanceBetween(ball, d);
      }
    });

  //if ball left player's hands and is now in someone else's hands, change player possession
  } else if (gameDetails.playerWithBall == -1 || distanceBetween(ball, gameDetails.playerWithBall) > spatialConfig.possessionXYDistance) {
    gameDetails.playerWithBall = -1;
    d3.selectAll('circle:not(.ball)').each(function (d) {
      if (ball && ball.z < spatialConfig.possessionZDistance && distanceBetween(ball, d) < spatialConfig.possessionXYDistance) {
        gameDetails.playerWithBall = d;
        gameDetails.teamPossession = d.team;
      }
    });
  }
}

function updatePlayerDefensiveAssignment(frame) {
  gameDetails.pairs = frame[7];
  var newLines = [];
  gameDetails.pairs.forEach(function (pair) {
    playerA = convertIDtoPlayer(pair[0], frame);
    playerB = convertIDtoPlayer(pair[1], frame);

    newLines.push({
      a: {
        x: playerA[2] * 10,
        y: playerA[3] * 10,
        pid: pair[0]
      },
      b: {
        x: playerB[2] * 10,
        y: playerB[3] * 10,
        pid: pair[1]
      },
      id: pair[0] + pair[1]
    });
  });

  var lines = d3.select('svg').selectAll('line')
    .data(newLines, function (d) { return d.pid; });

  lines.transition()
    .duration(animationDuration)
    .attr('x1', function (d) { return d.a.x; })
    .attr('y1', function (d) { return d.a.y; })
    .attr('x2', function (d) { return d.b.x; })
    .attr('y2', function (d) { return d.b.y; });

  lines.enter().append('line')
    .attr('x1', function (d) { return d.a.x; })
    .attr('y1', function (d) { return d.a.y; })
    .attr('x2', function (d) { return d.b.x; })
    .attr('y2', function (d) { return d.b.y; })
    .classed('def-line', true);

  lines.exit().remove();
}

function updateUIDetails(frame) {
  //update game and shot clocks
  $('.period').text(frame[0]);
  var gameMinutes = Math.floor(frame[2] / 60);
  var gameSeconds = pad(Math.round(frame[2] - gameMinutes * 60));
  $('.game-clock').text(gameMinutes + ':' + gameSeconds);
  $('.shot-clock').text(':' + pad(Math.floor(frame[3])));

  // Player with ball
  if (gameDetails.playerWithBall != -1) $('.ball-handler').text(gameDetails.playerWithBall.name);

  // On court players are in Plus/minus table
  frame[5].forEach(function (frameP) {
    if (frameP[1] !== -1 && $('#r' + frameP[1]).length === 0) {
      DATA.allPlayers.forEach(function (p) {
        if (p.playerid === frameP[1]) {
          $('<tr>')
            .attr('id', 'r' + p.playerid)
            .append('<td>' + p.team + '</td>')
            .append('<td>' + p.name + '</td>')
            .append('<td class="result--cell"></td>')
            .appendTo($('.results'));
        }
      });
    }
  });

  if ($('.results tr').length > 10) $('.results').empty();
}

function updatePlusMinusAndScore(frame) {
  var pbp = frame[6];
  $('.result--cell').text('');
  if (pbp.off && pbp.off.pts) {
    // add pts to offensive player
    var offPlayer = pbp.off.player_id;
    $('#r' + offPlayer).find('.result--cell').text(pbp.off.pts);

    //update scoreboard
    $('.score').text(pbp.score);

    // remove pts from defensive player
    gameDetails.pairs.forEach(function (p) {
      if (p.indexOf(offPlayer) >= 0) {
        p.forEach(function (defPlayer) {
          if (defPlayer === offPlayer) return;

          $('#r' + defPlayer).find('.result--cell').text('-' + pbp.off.pts);
        });
      }
    });
  }
}

function pad(n) {
  return (n < 10) ? ('0' + n) : n;
}

function distanceBetween(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

function convertIDtoPlayer(id, frame) {
  var player;
  frame[5].forEach(function (f) {
    if (f[1] === id) player = f;
  });

  return player || undefined;
}
