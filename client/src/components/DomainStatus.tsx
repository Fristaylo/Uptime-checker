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
  const problematicCountriesCount = log.results.filter(
    (r) => r.status_code !== 200 || r.total_time === null || (r.total_time && r.total_time > 2500)
  ).length;
  const totalCountries = log.results.length;

  if (problematicCountriesCount === totalCountries) {
    return styles.red;
  }
  if (problematicCountriesCount >= 3) {
    return styles.orange;
  }
  if (problematicCountriesCount >= 1 && problematicCountriesCount <= 2) {
    return styles.yellow;
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
            content={
              <div>
                <div>Время: {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div>Среднее время: {log.total_time_avg.toFixed(2)}ms</div>
                {log.results.filter(r => r.status_code !== 200 || r.total_time === null || (r.total_time && r.total_time > 2500)).length > 0 ? (
                  <div>
                    <div>Проблемные города:</div>
                    {log.results
                      .filter(r => r.status_code !== 200 || r.total_time === null || (r.total_time && r.total_time > 2500))
                      .map((r, i) => (
                        <div key={i}>
                          - {r.country}: {r.status_code !== null ? `Статус: ${r.status_code}` : 'Статус: N/A'}, Время: {r.total_time !== null ? `${r.total_time}ms` : 'Время: N/A'}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div>Все города в норме</div>
                )}
              </div>
            }
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