import { select as d3_select } from 'd3-selection';

import { Map } from '../3drenderer/Map';

import { t } from '../core/localizer';
import { uiCmd } from './cmd';


export function ui3DMap(context) {

  function threeDMap(selection) {
    let wrap = d3_select(null);
    let _isHidden = true;          // start out hidden
    let _map;

    function redraw() {
      if (_isHidden) return;
      updateProjection();
    }


    function updateProjection() {
      let bounds = [
        context.map().extent().min,
        context.map().extent().max
      ];
      _map.map.fitBounds(this.bounds = bounds);
    }

    function featuresToGeoJSON() {
      var mainmap = context.map();
      const entities = context.history().intersects(mainmap.extent());
      const buildingEnts = entities.filter(ent => {
          const tags = Object.keys(ent.tags).filter(tagname => tagname.startsWith('building'));
          return tags.length > 0;
      });
      var features = [];
      for (var id in buildingEnts) {
//            try {
              var gj = buildingEnts[id].asGeoJSON(context.graph());
              if (gj.type !== 'Polygon') continue;
              features.push({
                  type: 'Feature',
                  properties: {
                      extrude: true,
                      min_height: buildingEnts[id].tags.min_height ? parseFloat(buildingEnts[id].tags.min_height) : 0,
                      height: parseFloat(buildingEnts[id].tags.height || buildingEnts[id].tags['building:levels'] * 3 || 0)
                  },
                  geometry: gj
              });
//            } catch (e) {
//                console.error(e);
//            }
      }

      const buildingSource = _map.map.getSource('osmbuildings');

      if (buildingSource) {
        buildingSource.setData({
          type: 'FeatureCollection',
          features: features
        });
      }
  }

    function toggle(d3_event) {
      if (d3_event) d3_event.preventDefault();

      _isHidden = !_isHidden;

      context
        .container()
        .select('.three-d-map-toggle-item')
        .classed('active', !_isHidden)
        .select('input')
        .property('checked', !_isHidden);

      if (_isHidden) {
        wrap
          .style('display', 'block')
          .style('opacity', '1')
          .transition()
          .duration(200)
          .style('opacity', '0')
          .on('end', () => selection.selectAll('.three-d-map').style('display', 'none'));
      } else {
        wrap
          .style('display', 'block')
          .style('opacity', '0')
          .transition()
          .duration(200)
          .style('opacity', '1')
          .on('end', ()  => redraw());
      }
    }


    /* setup */
    ui3DMap.toggle = toggle;

    wrap = selection.selectAll('.three-d-map')
      .data([0]);

    let wrapEnter = wrap.enter()
      .append('div')
      .attr('class', 'three-d-map')
      .attr('id', '3d-buildings')
      .style('display', _isHidden ? 'none' : 'block');

    wrap = wrapEnter
      .merge(wrap);

    _map = new Map('3d-buildings'); // container id
      context.map().on('draw', () => redraw());

    context.on('enter.3dmap', (e) => {
        featuresToGeoJSON();
    });
    context.history().on('change.3dmap', (e) => {
        featuresToGeoJSON();
    });

    redraw();

    context.keybinding().on([uiCmd('⌘' + t('background.3dmap.key'))], toggle);
  }

  return threeDMap;
}
