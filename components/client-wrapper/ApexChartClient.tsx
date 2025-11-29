'use client';
import type { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
});

type PropsType = {
  type?: ApexChart['type'];
  height?: number | string;
  width?: number | string;
  getOptions: () => ApexOptions;
  series: ApexOptions['series'];
  className?: string;
};

const ApexChartClient = ({
  type,
  height,
  width = '100%',
  getOptions,
  series,
  className,
}: PropsType) => {
  const options = useMemo(() => getOptions(), []);

  return (
    <ReactApexChart
      type={type}
      height={height}
      width={width}
      options={options}
      series={series}
      className={className}
    />
  );
};

export default ApexChartClient;
