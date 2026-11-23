import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);
ChartJS.defaults.font.family = 'inherit';

export const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

const common = { responsive: true, maintainAspectRatio: false };

export function TrendChart({ labels, values, label = 'Revenue' }) {
  return (
    <div className="chart-box">
      <Line
        data={{
          labels,
          datasets: [{
            label, data: values, borderColor: PALETTE[0], backgroundColor: 'rgba(37,99,235,0.12)',
            fill: true, tension: 0.35, pointRadius: 2,
          }],
        }}
        options={{ ...common, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
      />
    </div>
  );
}

export function BarChartBox({ labels, values, label = 'Value', horizontal = false, money = false }) {
  return (
    <div className="chart-box">
      <Bar
        data={{ labels, datasets: [{ label, data: values, backgroundColor: PALETTE[0], borderRadius: 4 }] }}
        options={{
          ...common,
          indexAxis: horizontal ? 'y' : 'x',
          plugins: { legend: { display: false } },
          scales: { [horizontal ? 'x' : 'y']: { beginAtZero: true,
            ticks: money ? { callback: (v) => `₹${Number(v).toLocaleString('en-IN')}` } : undefined } },
        }}
      />
    </div>
  );
}

export function DonutChartBox({ labels, values }) {
  return (
    <div className="chart-box">
      <Doughnut
        data={{ labels, datasets: [{ data: values, backgroundColor: PALETTE, borderWidth: 0 }] }}
        options={{ ...common, cutout: '60%', plugins: { legend: { position: 'right' } } }}
      />
    </div>
  );
}
