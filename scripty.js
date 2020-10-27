var width = 1200;
var height = 800;
var svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)

d3.csv('ConglomeratesV2.csv').then(function(data){
    
    var links = data;
    svg.call(d3.drag().on('drag', () => event.preventDefault()))
    var nodes = []
    data.forEach(elem => {
        if(!nodes.some(d => d.name === elem.source)) nodes.push({name: elem.source, val: 50})
        if(!nodes.some(d => d.name === elem.target)) nodes.push({name: elem.target, val: 20})
    })
    
    //could use map/table for faster lookup
    //for both linkDist and bbox
    function linkDist(data){
        var obj = links.find(elem => elem.source.name == data.source.name)
        var dist = (+obj.revenue/1000)+10 + 25
        return dist
    }
    function bbox(data){
        var text = data.name
        var obj = links.find(d => d.source.name == text)
        var temp = svg.append('text').text(text)
        var textWidth = temp.node().getBoundingClientRect().width
        temp.remove()
        if(typeof obj != 'undefined') return (+obj.revenue/1000)+20
        else return (textWidth/4) + 5
    }
    
    function bboxH(data){
        var text = data.name
        var temp = svg.append('text').text(text)
        var bbox = temp.node().getBoundingClientRect()
        temp.remove()
        return bbox
    }
    
    var drag = simulation => {
        function dragStart(event, d){
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        function dragging(event, d){
            d.fx = event.x;
            d.fy = event.y;
        }
        function dragEnd(event, d){
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on('start', dragStart)
            .on('drag', dragging)
            .on('end', dragEnd)
    }
    
    var sources = nodes.filter(d => d.val == 50)
    var targets = nodes.filter(d => d.val != 50)
    function color(data, index){
        var obj = sources.find(elem => elem.name == data.name)
        var i = sources.indexOf(obj)
        //console.log(i)
        return d3.interpolateRainbow((i+1)/10)
        //d3.schemeCategory10[index]//d3.interpolateRainbow((index+1)/10)//d3.schemeSet3[index]
    }
    
    var sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.name).distance(d => linkDist(d)))
        .force('charge', d3.forceManyBody().strength(-200).theta(0.9).distanceMin(80))
        .force('collision', d3.forceCollide(d => bbox(d)).iterations(1))
        //.force('center', d3.forceCenter().x(width/2).y(height/2).strength(1))
        .force('x', d3.forceX().x(width/2))
        .force('y', d3.forceY().y(height/2))
    
    var svgLinks = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
            .attr('stroke', d => color(d.source, 1))
            .attr('stroke-width', 3)

    var svgNodes = svg.append('g')
    
    //Figures are for fiscal year ended June 30, 2019.
    //Numbers in Millions
    var svgRects = svgNodes.selectAll('rect')
        .data(targets).enter()
        .append('rect')
            .attr('id', (d,i) => 'R'+i)
            .attr('width', d => (bbox(d)*2)-10)
            .attr('height', d => bboxH(d).height/2)
            .attr('radius', d => (bbox(d)+5))
            .attr('stroke', 'none')
            .attr('fill', '#fff')
            .attr('cursor', 'pointer')
            .call(drag(sim))
    
    var svgCircles = svgNodes.selectAll('circle')
        .data(sources).enter()
        .append('circle')
            .attr('id', (d,i) => 'C'+i)
            .attr('r', d => {
                var rev = +links.find(elem => elem.source.name == d.name).revenue/1000
                return rev + 20
            })
            .attr('radius', d => bbox(d) + 6)
            .attr('stroke', '#000')
            .attr('fill', (d, i) => d3.interpolateRgb(color(d,i), '#fff')(0.5))
            .attr('cursor', 'pointer')
            .call(drag(sim))
    
    var Text = svgNodes.selectAll('text')
        .data(nodes)
    
    var svgText = Text.enter()
        .append('text')
            .attr('id', (d,i) => 'T'+i)
            .attr('font-size', d => {
                if(d.name == 'Hasbro') return '10px'
                else if(d.val == 50) return '15px'
                else return '10px'
            })
            .attr('font-weight', d => (d.val == 50)?'400':'100')
            .attr('pointer-events', 'none')
            .text(d => d.name)
    
    var svgBottomText = Text.enter()
        .append('text')
            .attr('id', (d,i) => 'B'+i)
            .attr('font-size', d => {
                var obj = links.find(elem => elem.source.name == d.name)
                if((typeof obj != 'undefined') && (obj.source.name != 'Hasbro')) return '12px'
                else return '6px'
            })
            .attr('pointer-events', 'none')
            .text(d => {
                var obj = links.find(elem => elem.source.name == d.name)
                if(typeof obj != 'undefined') return '($'+ d3.format(',')(+obj.revenue)+' million)'
                else return ''
            })
    
    d3.select('body').selectAll('text')
        .style('font-family', 'Optima')
    var zoom = d3.zoom()
        .scaleExtent([1, 2])
        .translateExtent([[-200, -200], [width + 500, height + 500]])
        .on("zoom", zoomed);
    
    //svg.call(zoom)
    function zoomed(event, d){
        svgNodes.attr('transform', event.transform)
        svgLinks.attr('transform', event.transform)
    }
    sim.on('tick', () => {
        //bounding svgs to viewport, from a d3 example online
        svgCircles
            .attr("cx", (d,i) => {
                var r = d3.select('#C'+i).attr('radius')
                return d.x = Math.max(r, Math.min(width - r, d.x))
            })
            .attr("cy", (d,i) => {
                var r = d3.select('#C'+i).attr('radius')
                return d.y = Math.max(r, Math.min(height - r, d.y))
            })        
        svgRects
            .attr('x', (d,i) => {
                var r = d3.select('#R'+i).attr('radius')
                d.x = Math.max(r, Math.min(width - r, d.x))
                return d.x - (bboxH(d).width/4)
            })
            .attr('y', (d,i) => {
                var r = d3.select('#R'+i).attr('radius')
                d.y = Math.max(r, Math.min(height - r, d.y))
                return d.y - 5
            })
        
        svgText.each((d, i) => {
            var text = d3.select('#T'+i)
            var bottomText = d3.select('#B'+i)
            var btWidth = bottomText.node().getBoundingClientRect().width
            var tWidth = text.node().getBoundingClientRect().width
            var offset = (text.text()=='Hasbro')?8:15
            text
                .attr('x', d => {
                    return d.x - (tWidth/2)
                })
                .attr('y', d => d.y + 2.5)
            bottomText
                .attr('x', d => {
                    return d.x - (btWidth/2)
                })
                .attr('y', d => d.y + offset)
                
        })
        
        svgLinks
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
    })

})