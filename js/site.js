// getElementById
function $id(id) {
  return document.getElementById(id);
}

//
// output information
function Output(msg) {
  var m = $id("messages");
  m.innerHTML = msg + m.innerHTML;
}

// call initialization file
if (window.File && window.FileList && window.FileReader) {
  Init();
}

//
// initialize
function Init() {

  var fileselect = $id("fileselect"),
    filedrag = $id("filedrag"),
    submitbutton = $id("submitbutton");

  // file select
  fileselect.addEventListener("change", FileSelectHandler, false);

  // is XHR2 available?
  var xhr = new XMLHttpRequest();
  if (xhr.upload) {
  
    // file drop
    filedrag.addEventListener("dragover", FileDragHover, false);
    filedrag.addEventListener("dragleave", FileDragHover, false);
    filedrag.addEventListener("drop", FileSelectHandler, false);
    filedrag.style.display = "block";
    
    // remove submit button
    submitbutton.style.display = "none";
  }

}

// file drag hover
function FileDragHover(e) {
  e.stopPropagation();
  e.preventDefault();
  e.target.className = (e.type == "dragover" ? "hover" : "");
}

// file selection
function FileSelectHandler(e) {

  // cancel event and hover styling
  FileDragHover(e);

  // fetch FileList object
  var files = e.target.files || e.dataTransfer.files;

  // process all File objects
  for (var i = 0, f; f = files[i]; i++) {
    ParseFile(f);
  }

}

//loading file

function ParseFile(file) {
  //parse csv file
  Papa.parse(file, {
    header: true,
    complete: function(results) {
      processData(results.data);
    }
  });
  
}

//processing data

function processData(data){
  data = convertDates(data);
  data = removeBeforeApril20(data);
  data = removePauses(data);
  generateFilters(data);
  generateAnalysis(data)
}

function generateFilters(data){
  sections = [];
  data.forEach(function(d){
    if(d['Media Content Type']=='Videos'){
      if(sections.indexOf(d['Destination'])==-1){
        sections.push(d['Destination']);
      }
    }
  });
  $('#filters').append('<div class="row"><div class="col-md-12"><p>Filter Data For:</p><fieldset><p id="filterlist"></p></fieldset></div></div>');
  sections.forEach(function(section){
    $('#filterlist').append('<input class="sectionfilters" type="checkbox" name="sections" value="'+section+'" checked> '+section+' - ');
  });
  $('.sectionfilters').on('change',function(e){
    let selectedItems = [];

    $("#filterlist").find("input:checked").each(function (i, ob) { 
        selectedItems.push($(ob).val());
    });
    filteredData = data.filter(function(d){
      if(selectedItems.indexOf(d['Destination'])==-1){
        return false;
      } else {
        return true;
      }
    });
    generateAnalysis(filteredData);
  });
}

function generateAnalysis(data){
  $('#content').html('');
  let videos = getVideosByDate(data);
  videos = processVideosToTimeBuckets(videos);
  let assets = processVideosByAsset(videos);
  generateSummary(data,videos,assets);
  generateDetails(videos,data);  
}



//convert to date objects

function convertDates(data){
  data.forEach(function(d,i){
    d['parsedDate'] = new Date(d['Event Start Time UTC']);
  });
  return data;
}

//removing data before April 2020 as data not complete

function removeBeforeApril20(data){
  date = new Date(2019,03,20)
  data = data.filter(function(d){
    if(d.parsedDate<date){
      return false
    } else {
      return true
    }
  });
  return data;
};

//removing pauses to accurate watch time

function removePauses(data){
  data = data = data.filter(function(d){
    if(d['Media Content Action']=='Paused'){
      return false
    } else {
      return true
    }
  });
  return data;
}

// processing videos to get single entry per video watched.
//data going in has video refreshed every 60 seconds

function getVideosByDate(data){
  lookup = {};
  data.forEach(function(d){
    if(d['Media Content Type']=='Videos'){
      pageTitle = '';
      assetGroup = '';
      if(d['Page Name'].substr(0,19)=='iplayer.tv.episode.' || d['Page Name'].substr(0,21)=='iplayer.tv.simulcast.' || d['Page Name'].substr(0,19)=='iplayer.tv.webcast.' || d['Page Name'].substr(0,20)=='iplayer.tv.channels.'){
        assetGroup = d['Page Name'].split('.')[3];
      } else {
        assetGroup = d['Page Name'].split('.')[0]+' '+d['Page Name'].split('.')[1];
      }
      let content = d['Page Name']+d['Visit Start Time UTC']
      if(content in lookup){
        lookup[content].time += parseInt(d['Playback Time']);
      } else {
        lookup[content] = {'time':parseInt(d['Playback Time']),'date':d['parsedDate'],'section':d['Destination'],'video':d['Page Name'],'sessionID':d['Visit Start Time UTC'],'title':pageTitle,'asset group':assetGroup};
      }
    }
  });
  let output = [];
  for(key in lookup){
    let values = lookup[key];
    output.push(values);
  }
  return output;
}

function getSession(sessionID,data){
  let sessionData = data.filter(function(d){
    if(d['Visit Start Time UTC']==sessionID){
      return true;
    } else {
      return false;
    }
  });
  return sessionData;
}

function processSession(sessionData){
    output = [];
    sessionData.sort(function(a,b){
      return new Date(a['Event Start Time UTC']) - new Date(b['Event Start Time UTC']);
    })
    currentVid = "";
    sessionData.forEach(function(d){
      if(d['Media Content Type']!='Videos' && d['Page Name']!='keepalive'){
        output.push({'page name':d['Page Name'],'url':d['URL'],'source':'page'});
      }
      if(d['Media Content Type']=='Videos'){
        if(currentVid!=d['Page Name']){
          output.push({'page name':d['Page Name'],'url':d['URL'],'source':'video'});
          currentVid = d['Page Name'];
        }
      }
    });
    let html = '<ul>';
    output.forEach(function(v){
      html += '<li><b>'+v.source+'</b>: '+v['page name']+'</li>';
    });
    $("#journeycontent").html(html);
    $("#journeymodal").modal('show'); 
}

//process videos into time watching buckets
function processVideosToTimeBuckets(videos){
  let timeBuckets = [
    {'name':'night','min':0,'max':5},
    {'name':'morning','min':5,'max':12},
    {'name':'afternoon','min':12,'max':16},
    {'name':'early evening','min':16,'max':20},
    {'name':'late evening','min':20,'max':24},
  ];

  videos.forEach(function(v){
    console.log(v.date);
    let hour = v.date.getHours();
    console.log(hour);
    v.timeBucket = assignBucket(hour,timeBuckets);
  });
  return videos;
}

function processVideosByAsset(videos){
  assets = {}
  videos.forEach(function(v){
    asset = v['asset group'];
    if(asset in assets){
      assets[asset].totalTime += v['time'];
    } else {
      assets[asset] = {'totalTime':v['time'],'name':asset}
    }
  });
  output = [];
  for(key in assets){
    output.push(assets[key]);
  }
  console.log(output);
  return output;
}

function assignBucket(hour,buckets){
  let bucket = '';
  buckets.forEach(function(b){
    if(hour>=b.min && hour <b.max){
      bucket = b.name;
    }
  });
  return bucket;
}

function generateSummary(data,videos,assets){
  $('#content').append('<div id="headline" class="row"></div>');
  $('#content').append('<div id="summary" class="row"></div>');
  [totalTime,watchTime] = watchByTime(data);
  headline('#headline','Total Time Watched',totalTime,'hours');
  barChart('#summary','Minutes Watched per Hour of the day',watchTime);
  condensedTimeline('#summary','Video Timeline',videos);
  top10ListByTime('#summary',assets)
}

function top10ListByTime(id,assets){
  console.log(assets);
  assets.sort(function(a,b){
    return b.totalTime-a.totalTime;
  });
  $(id).append('<p class="charttitle">Top 10 watched</p>');
  $(id).append('<ul id="toplist"></ul>');
  assets.forEach(function(asset,i){
    if(i<10){
      time = Math.round(asset.totalTime/360)/10
      $('#toplist').append('<li><p>'+asset.name+' - '+time+'hrs</p></li>')
    }
    i++
  });
}

function watchByTime(data){
  let totalTime = 0;
  time = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  data.forEach(function(d){
    if(d['Media Content Type']=='Videos'){
      let hour = d.parsedDate.getHours();
      time[hour] +=parseInt(d['Playback Time']);
      totalTime +=parseInt(d['Playback Time']);
    }
  });
  let output = [];
  time.forEach(function(d,i){
    output.push({'key':i,'value':Math.round(d/60)});
  });
  return [Math.round(totalTime/3600),output];
}

function generateDetails(videos,data){
  $('#content').append('<div id="details"></div>');
  videos.sort(function(a,b){
    return new Date(a.date) - new Date(b.date);
  });
  
  let currentMonth = 0
  let currentRowID = '';
  videos.forEach(function(d,i){
    let videoMonth = d.date.getMonth();
    if(currentMonth!=videoMonth){
      currentMonth = videoMonth;
      $('#details').append('<div id="monthrow'+currentMonth+'" class="row"></div>');
      $('#monthrow'+currentMonth).append('<div class="col-md-12"><h2>'+months[currentMonth]+'</h2></div>');
    }
    $('#monthrow'+currentMonth).append(videoCard('video'+i,d));
    $('#video'+i).on('click',function(e){
      let session = d['sessionID'];
      let sessionData = getSession(session,data);
      processSession(sessionData);
    });
  });
}

let months = [ "January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December" ];