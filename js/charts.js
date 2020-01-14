function headline(id,text,keyfigure,unit){
  let html = `
    <div class="col-md-3">
      <p class="headlinetext">{{text}}</p>
      <p class="headlinenumber">{{keyfigure}}</p>
      <p class="headlineunit">{{unit}}</p>
    </div>
  `;
  html = html.replace('{{text}}',text).replace('{{keyfigure}}',keyfigure).replace('{{unit}}',unit);
  $(id).append(html);
}

function videoCard(id,d){
  let html = `
    <div id="{{id}}"class="col-md-3 videocardouter">
      <div class="videocard">
        <div class="topframe {{sectionclass}}color">{{section}}</div>
        <p>{{asset title}}</p>
        <p>{{video name}}</p>
        <p>Time spent: {{time spent}}</p>
      </div>
    </div>
  `;
  let minutes = Math.floor(d['time']/60);
  let seconds = d['time']-minutes*60;
  let time = minutes + 'm '+seconds+'s';
  html = html.replace('{{id}}',id);
  html = html.replace('{{section}}',d['section'].replace('PS_',''));
  html = html.replace('{{sectionclass}}',d['section'].replace('PS_',''));
  html = html.replace('{{asset title}}',d['asset group']);
  html = html.replace('{{video name}}',d['video'].split('.').join(' .'));
  html = html.replace('{{time spent}}',time);

  return html;
}

function barChart(id,title,data){

  $(id).append('<p class="charttitle">'+title+'</p>');

  var margin = {top: 30, right: 20, bottom: 70, left: 40},
      width = 600 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

  var x = d3.scale.ordinal().rangeRoundBands([0, width], .05);

  var y = d3.scale.linear().range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var svg = d3.select(id).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", 
            "translate(" + margin.left + "," + margin.top + ")");
  	
  x.domain(data.map(function(d) { return d.key; }));
  y.domain([0, d3.max(data, function(d) { return d.value; })]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", ".5em")
      .attr("dy", ".75em");

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Minutes");

  svg.selectAll("bar")
      .data(data)
    .enter().append("rect")
      .style("fill", "#f54997")
      .attr("x", function(d) { return x(d.key); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); });

}

function condensedTimeline(id,title,data){

  let newData = jQuery.extend(true, [], data);

  newData = newData.sort(function(a,b){
     return new Date(a.date) - new Date(b.date);
  });
  $(id).append('<p class="charttitle">'+title+'</p><p id="assettitle"></p>');

  var margin = {top: 20, right: 20, bottom: 70, left: 50},
      width = $( window ).width()-100 - margin.left - margin.right,
      height = 350 - margin.top - margin.bottom;

  var x = d3.time.scale().range([0, width]);
  x.domain(d3.extent(data,function(d) { return d.date; }));

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickFormat(d3.time.format("%Y-%m-%d"));

  var svg = d3.select(id).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", 
            "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .selectAll("text")
      .style("text-anchor", "end")
      .attr("transform", function(d) {
                return "rotate(-65)" 
                });
  
  newData.forEach(function(d,i){
    newData[i].newDate = new Date(d.date.getTime());
    newData[i].newDate.setHours(0,0,0,0);
  });

  let currentDay = newData[0].date;
  let currentBucket=0;
  let vidNum = 0;
  let buckets = ['morning','afternoon','early evening','late evening','night'];


  svg.selectAll("circle")
      .data(newData)
    .enter().append("circle")
      .attr("cx", function(d) { return x(d.newDate); })
      .attr("cy", function(d) {
        bucket = buckets.indexOf(d.timeBucket);
        console.log(d);
        console.log(currentDay.getTime());
        console.log(d.newDate.getTime());
        if(currentDay.getTime() !== d.newDate.getTime()) {
          currentBucket = -1;
          currentDay = d.newDate;
        }
        if(currentBucket!=bucket){
          vidNum = 0
          currentBucket = bucket
        }
        let ypos = 50*(4-bucket)+7*vidNum+4;
        vidNum++;
        return ypos;
      })
      .attr("r", 3)
      .attr('class',function(d){
        return d['section'].replace('PS_','')+'color';
      })
      .on('mouseover',function(d){
        console.log(d);
        $('#assettitle').html(d['asset group']);
      });

    let lineG = svg.append('g');

    lineG.selectAll('lines')
      .data(buckets)
      .enter()
      .append('line')
      .attr('x1',0)
      .attr('x2',width)
      .attr('y1',function(d,i){return i*50})
      .attr('y2',function(d,i){return i*50})
      .attr("stroke-width", 0.5)
      .attr("stroke", "#999");

  let yLabelsG = svg.append('g');

    yLabelsG.selectAll('text')
      .data(buckets)
      .enter()
      .append('text')
      .attr("x", function(d,i) { return -50; })
      .attr("y", function(d,i) { return (4-i)*50+20; })
      .text( function (d) { return d})
      .attr("font-family", "sans-serif")
      .attr("font-size", "10px");

}