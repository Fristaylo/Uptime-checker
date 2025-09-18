import styles from "./StatusPlug.module.scss";

import { domains } from "../data/constants";

interface StatusPlugProps {
  domain?: string;
}

const StatusPlug: React.FC<StatusPlugProps> = ({ domain }) => {
  const domainsToRender = domain ? [domain] : domains;

  return (
    <div className={styles.statusContainer}>
      {domainsToRender.map((d) => (
        <div key={d} className={styles.domainSection}>
          <div className={styles.domainName}></div>
          <div className={styles.requests}>
            <div className={styles.requestBlock}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatusPlug;