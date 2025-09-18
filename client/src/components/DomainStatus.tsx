import { useRef } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import useResize from '../hooks/useResize';
import styles from './Status.module.scss';

interface GroupedLog {
  created_at: string;
  total_time_avg: number;
  results: {
    country: string;
    status_code: number | null;
    total_time: number | null;
  }[];
}

interface DomainStatusProps {
  domain: string;
  logs: GroupedLog[];
}

const getStatusColor = (log: GroupedLog) => {
  const failedCountries = log.results.filter(
    (r) => r.status_code !== 200 || r.total_time === null
  ).length;
  const totalTimeAvg = log.total_time_avg;

  if (totalTimeAvg > 2500) {
    if (failedCountries === log.results.length) return styles.red;
    if (failedCountries >= 3) return styles.orange;
    if (failedCountries >= 1) return styles.yellow;
  }
  return styles.green;
};

const DomainStatus: React.FC<DomainStatusProps> = ({ domain, logs }) => {
  const requestsRef = useRef<HTMLDivElement>(null);
  const width = useResize(requestsRef);

  const blockBasis = 10;
  const blockGap = 4;
  const maxBlocks = width > 0 ? Math.floor(width / (blockBasis + blockGap)) : 0;
  const visibleLogs = maxBlocks > 0 ? logs.slice(-maxBlocks) : [];

  return (
    <div className={styles.domainSection}>
      <h4>{domain}</h4>
      <div className={styles.requests} ref={requestsRef}>
        {visibleLogs.map((log, index) => (
          <Tippy
            key={`${log.created_at}-${index}`}
            content={`${new Date(
              log.created_at
            ).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}, Среднее время: ${log.total_time_avg.toFixed(2)}ms`}
          >
            <div
              className={`${styles.requestBlock} ${getStatusColor(log)}`}
            />
          </Tippy>
        ))}
      </div>
    </div>
  );
};

export default DomainStatus;