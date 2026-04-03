(function bootstrapBayesianTracker() {
  "use strict";

  const DECIMAL_DIGITS = 3;

  function safeRate(successes, total) {
    if (total <= 0) {
      return 0;
    }
    return successes / total;
  }

  class BayesianTracker {
    constructor(chartCanvas, statsElements) {
      this.chartCanvas = chartCanvas;
      this.statsElements = statsElements || {};
      this.maxPoints = 2000;
      this.chart = null;
      this.reset();
      this.initChart();
      this.render();
    }

    reset() {
      this.alphaStay = 1;
      this.betaStay = 1;
      this.alphaSwitch = 1;
      this.betaSwitch = 1;
      this.stayWins = 0;
      this.switchWins = 0;
      this.totalTrials = 0;
      this.lastRound = null;
      if (this.chart) {
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        this.chart.data.datasets[1].data = [];
        this.chart.update("none");
      }
      this.render();
    }

    initChart() {
      if (!this.chartCanvas || !window.Chart) {
        return;
      }

      const ctx = this.chartCanvas.getContext("2d");
      this.chart = new window.Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Stay Posterior Mean",
              data: [],
              borderColor: "#2a6fdb",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.15
            },
            {
              label: "Switch Posterior Mean",
              data: [],
              borderColor: "#ef8354",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.15
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 120,
          animation: false,
          interaction: {
            intersect: false,
            mode: "nearest"
          },
          scales: {
            y: {
              min: 0,
              max: 1,
              ticks: { color: "#3c5368" },
              grid: { color: "rgba(28, 45, 59, 0.16)" }
            },
            x: {
              ticks: { color: "#3c5368", maxTicksLimit: 8 },
              grid: { color: "rgba(28, 45, 59, 0.12)" }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: "#1c2d3b",
                font: {
                  family: "Space Grotesk, Trebuchet MS, sans-serif",
                  size: 12
                }
              }
            },
            tooltip: {
              callbacks: {
                label(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(DECIMAL_DIGITS)}`;
                }
              }
            }
          }
        }
      });
    }

    recordRound(result, options) {
      const deferChartUpdate = Boolean(options && options.deferChartUpdate);
      if (!result) {
        return;
      }

      this.totalTrials += 1;
      this.lastRound = result;

      if (result.stayWin) {
        this.alphaStay += 1;
        this.stayWins += 1;
      } else {
        this.betaStay += 1;
      }

      if (result.switchWin) {
        this.alphaSwitch += 1;
        this.switchWins += 1;
      } else {
        this.betaSwitch += 1;
      }

      this.appendToChart(this.totalTrials, deferChartUpdate);
      this.render();
    }

    appendToChart(step, deferChartUpdate) {
      if (!this.chart) {
        return;
      }

      const stayMean = this.getStayPosteriorMean();
      const switchMean = this.getSwitchPosteriorMean();
      const labels = this.chart.data.labels;
      const stayData = this.chart.data.datasets[0].data;
      const switchData = this.chart.data.datasets[1].data;

      labels.push(step);
      stayData.push(stayMean);
      switchData.push(switchMean);

      if (labels.length > this.maxPoints) {
        labels.shift();
        stayData.shift();
        switchData.shift();
      }

      if (!deferChartUpdate) {
        this.chart.update("none");
      }
    }

    flushChart() {
      if (this.chart) {
        this.chart.update("none");
      }
      this.render();
    }

    getStayPosteriorMean() {
      return this.alphaStay / (this.alphaStay + this.betaStay);
    }

    getSwitchPosteriorMean() {
      return this.alphaSwitch / (this.alphaSwitch + this.betaSwitch);
    }

    getFrequentistRates() {
      return {
        stayRate: safeRate(this.stayWins, this.totalTrials),
        switchRate: safeRate(this.switchWins, this.totalTrials)
      };
    }

    render() {
      const els = this.statsElements;
      if (!els) {
        return;
      }

      const rates = this.getFrequentistRates();
      const switchAdvantage = rates.switchRate - rates.stayRate;

      if (els.trialCount) {
        els.trialCount.textContent = String(this.totalTrials);
      }
      if (els.stayRate) {
        els.stayRate.textContent = rates.stayRate.toFixed(DECIMAL_DIGITS);
      }
      if (els.switchRate) {
        els.switchRate.textContent = rates.switchRate.toFixed(DECIMAL_DIGITS);
      }
      if (els.switchAdvantage) {
        els.switchAdvantage.textContent = switchAdvantage.toFixed(DECIMAL_DIGITS);
      }
    }
  }

  window.BayesianTracker = BayesianTracker;
})();
