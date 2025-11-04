import React from "react";
import styles from "./Header.module.scss";
import DomainDropdown from "./DomainDropdown";

const Header: React.FC = () => {
    return (
        <div className={styles.headerContainer}>
            <div className={styles.header}>
                <div className={styles.logoContainer}>
                    <span className={styles.logo}>YummyUptime</span>
                </div>
                <nav className={styles.nav}>
                    <DomainDropdown />
                </nav>
            </div>
        </div>
    );
};

export default Header;
