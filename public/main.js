$(document).ready(function(){

  var Template = function(name){
    var script = $('#' + name);
    this.template = script.html();
    this.container = script.parent();
    script.remove();
  };

  Template.prototype.render = function(data){
    var html = Mustache.to_html(this.template, data);
    if (this.container.html() !== html) {
      this.container.html(html);
    }
  };

  var util = {};

  util.sortBy = function(property){
    return function(a, b){
      var ka = a[property];
      var kb = b[property];
      if (ka < kb) { return -1; }
      if (ka > kb) { return  1; }
      return 0;
    };
  };

  var template = new Template('projects_template');

  var setHealth = function(ok){
    if (ok) {
      $('html').removeClass('unhealthy').addClass('healthy');
    } else {
      $('html').removeClass('healthy').addClass('unhealthy');
    }
  };

  var setStatus = function(text){
    $('#status span').text(text);
  };

  var setUpdated = function(when){
    $('#updated span').text('' + (when || 'Never'));
  };

  var setVisibility = function(v){
    $('#cc').css('opacity', v);
  };

  var lastProjects = [],
      startFontSize = parseInt($('#cc').css('font-size'), 10);

  var receivedCc = function(data){
    setUpdated(data.lastUpdate);
    setHealth(data.status == 'success');
    setStatus('client = receiving; server = ' + data.status);

    lastProjects = data.projects.sort(util.sortBy('lastBuildTime')).reverse();
    render(lastProjects);
  };

  var render = function() {
    var groupings = ["dollfactory", "shedgame", "makie.me", "dressup", "misc"];
    var names = ["dollfactory", "shedgame", "mymakie.com", "dressup", "misc"];
    var replace = ["dollfactory ", "shedgame ", "makie.me ", "dressup ", ""];
    var groups = $.map(groupings, function(el, i) {
      return { prefix: el.toLowerCase(), name: names[i], replace: replace[i].toLowerCase(), projects: [] };
    });
    $('#cc').css('font-size', startFontSize);
    $.each(lastProjects, function(i, p) {
       var name = p.name.toLowerCase().replace(/[_-]/g, " ");
       $.each(groups, function(i, g) {
          if (name.indexOf(g.prefix) === 0 || i == groups.length - 1) {
            var proj = $.extend({}, p);
            proj.name = name.replace(g.replace,"");
            g.projects.push(proj);
            return false;
          }
       });
    });
    template.render({groups: groups});
    shrinkToFit();
  };

  var shrinkToFit = function(){
    var fontSize =  parseInt($('#cc').css('font-size'), 10);
        lastItem = $('#cc li:last-child ul li:last-child');

    if (fontSize < 20 || lastItem.length < 1) {
      setVisibility(1);
      return;
    }

    var maxHeight = $('html').outerHeight(),
        overflow = lastItem.offset().top + lastItem.outerHeight() - maxHeight;

    if (overflow > 0) {
      setVisibility(0);
      var a = Math.max(Math.ceil(Math.log(overflow)), 1);
      $('#cc').css('font-size', (fontSize - a) + 'px');
      setTimeout(shrinkToFit, 1);
    } else {
      setVisibility(1);
    }
  };

  setStatus('client = no connection.');
  setHealth(true);

  var socket = io.connect('/');
  socket.on('ccjson', receivedCc)
        .on('connecting', function (){
          setStatus('client = connecting.');
          setHealth(true);
        })
        .on('connect', function(){
          setStatus('client = connected.');
          setHealth(true);
        })
        .on('disconnect', function(error) {
          setStatus('client = ' + (error || 'disconnected'));
          setHealth(false);
        })
        .on('error', function(error) {
          setStatus('client = ' + (error || 'unknown error'));
          setHealth(false);
        });

  $(window).bind('resize', render);
});
