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
    $('#cc').css('font-size', startFontSize);
    template.render({projects: lastProjects});
    shrinkToFit();
  };

  var shrinkToFit = function(){
    var fontSize =  parseInt($('#cc').css('font-size'), 10);
        lastItem = $('#cc li:last-child');

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

  var events = [];
  var events_template = new Template('event_template');
  var pusher = new Pusher(PUSHER_API_KEY);
  var channel = pusher.subscribe('build_events');
  var show_event = function(varname) {
    return function(data) {
     var ctx = {when: new Date()};
     ctx[varname] = data;
     events.unshift(ctx);
     events = events.slice(-10);
     events_template.render({events: events });
    };
  };
  channel.bind('image', show_event("img"));
  channel.bind('text', show_event("text"));

  $(window).bind('resize', function (){
    $('#cc').css('font-size', startFontSize);
    template.render({projects: lastProjects});
    shrinkToFit();
  });
});
