import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./DomainDropdown.module.scss";
import { domains } from "../data/constants";

const DomainDropdown: React.FC = () => {
    const navigate = useNavigate();
    const { domain: currentDomainParam } = useParams<{ domain: string }>();
    const [isOpen, setIsOpen] = useState(false);
    const [currentSelection, setCurrentSelection] = useState("Все домены");

    useEffect(() => {
        setCurrentSelection(
            currentDomainParam
                ? domains.find((d) => d === currentDomainParam) || currentDomainParam
                : "Все домены"
        );
    }, [currentDomainParam]);

    const handleSelect = (domain: string) => {
        if (currentSelection === domain) {
            setIsOpen(false);
            return;
        }
        setCurrentSelection(domain);
        setIsOpen(false);
        if (domain === "Все домены") {
            navigate("/");
        } else {
            navigate(`/${domain}`);
        }
    };

    return (
        <div className={styles.dropdownContainer}>
            <button className={styles.dropdownHeader} onClick={() => setIsOpen(!isOpen)}>
                {currentSelection}
                <span className={styles.arrow}>&#9660;</span>
            </button>
            {isOpen && (
                <ul className={styles.dropdownList}>
                    <li
                        className={`${styles.dropdownItem} ${
                            currentSelection === "Все домены" ? styles.selected : ""
                        }`}
                        onClick={() => handleSelect("Все домены")}
                    >
                        Все домены
                    </li>
                    {domains.map((domain) => (
                        <li
                            key={domain}
                            className={`${styles.dropdownItem} ${
                                currentSelection === domain ? styles.selected : ""
                            }`}
                            onClick={() => handleSelect(domain)}
                        >
                            {domain}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default DomainDropdown;