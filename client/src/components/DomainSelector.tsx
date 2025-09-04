import { Link } from "react-router-dom";
import styles from "./DomainSelector.module.scss";
import { domains } from "../data/constants";

const DomainSelector = () => {
  return (
    <div className={styles.container}>
      <h1>Выберите домен</h1>
      <ul className={styles.domainList}>
        {domains.map((domain) => (
          <li key={domain}>
            <Link to={`/dashboard/${domain}`}>{domain}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DomainSelector;