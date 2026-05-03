import ApexCharts from 'apexcharts';

export function chart(node: HTMLElement, options: any) {
	let chartInstance: ApexCharts | null = null;

	function createChart() {
		if (chartInstance) {
			chartInstance.destroy();
		}
		chartInstance = new ApexCharts(node, options);
		chartInstance.render();
	}

	createChart();

	return {
		update(newOptions: any) {
			options = newOptions;
			if (chartInstance) {
				chartInstance.updateOptions(options, true);
			} else {
				createChart();
			}
		},
		destroy() {
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
		}
	};
}
