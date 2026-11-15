import { BarChart, HeatmapChart, LineChart, ScatterChart } from 'echarts/charts';
import { GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';

echarts.use([LineChart, BarChart, HeatmapChart, ScatterChart, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, MarkLineComponent, MarkAreaComponent, CanvasRenderer]);

export function Chart({ option, height = 280, label }: { option: object; height?: number; label: string }) {
  const el = useRef<HTMLDivElement>(null), chart = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    const c = (chart.current = echarts.init(el.current!)), ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current!);
    return () => { ro.disconnect(); c.dispose(); chart.current = null; };
  }, []);
  // Only the first draw is animated. While the simulation plays the option changes every second, and replaying the
  // entrance animation each time left lines half drawn.
  const drawn = useRef(false);
  useEffect(() => { chart.current?.setOption((drawn.current ? { ...option, animation: false } : option) as never, true); drawn.current = true; }, [option]);
  return <div ref={el} role="img" aria-label={label} style={{ height, width: '100%' }} />;
}
