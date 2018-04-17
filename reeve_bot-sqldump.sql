
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table deposit
# ------------------------------------------------------------

DROP TABLE IF EXISTS `deposit`;

CREATE TABLE `deposit` (
  `telegram_id` varchar(32) NOT NULL DEFAULT '',
  `pid` char(4) DEFAULT NULL,
  `eff_date` date DEFAULT NULL,
  `exp_date` date DEFAULT NULL,
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `telegram_id` (`telegram_id`),
  CONSTRAINT `deposit_ibfk_1` FOREIGN KEY (`telegram_id`) REFERENCES `user` (`telegram_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DELIMITER ;;
/*!50003 SET SESSION SQL_MODE="" */;;
/*!50003 CREATE */ /*!50003 TRIGGER `exp_date` BEFORE INSERT ON `deposit` FOR EACH ROW begin
set NEW.eff_date = NOW();
if (NEW.pid = '1') then
	set NEW.exp_date = DATE_ADD(NOW(), INTERVAL 1 YEAR);
end if;
end */;;
DELIMITER ;
/*!50003 SET SESSION SQL_MODE=@OLD_SQL_MODE */;


# Dump of table lunchbox
# ------------------------------------------------------------

DROP TABLE IF EXISTS `lunchbox`;

CREATE TABLE `lunchbox` (
  `b_id` int(11) NOT NULL AUTO_INCREMENT,
  `remark` varchar(32) DEFAULT NULL,
  `cycle` int(11) DEFAULT '0',
  PRIMARY KEY (`b_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table rental
# ------------------------------------------------------------

DROP TABLE IF EXISTS `rental`;

CREATE TABLE `rental` (
  `r_id` int(11) NOT NULL AUTO_INCREMENT,
  `t_id` varchar(32) DEFAULT NULL,
  `b_id` int(11) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`r_id`),
  KEY `b_id` (`b_id`),
  KEY `t_id` (`t_id`),
  CONSTRAINT `rental_ibfk_1` FOREIGN KEY (`b_id`) REFERENCES `lunchbox` (`b_id`),
  CONSTRAINT `rental_ibfk_2` FOREIGN KEY (`t_id`) REFERENCES `user` (`telegram_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DELIMITER ;;
/*!50003 SET SESSION SQL_MODE="" */;;
/*!50003 CREATE */ /*!50003 TRIGGER `default-date` BEFORE INSERT ON `rental` FOR EACH ROW if ( isnull(new.start_date) ) then
 set new.start_date=curdate();
end if */;;
DELIMITER ;
/*!50003 SET SESSION SQL_MODE=@OLD_SQL_MODE */;


# Dump of table status
# ------------------------------------------------------------

DROP TABLE IF EXISTS `status`;

CREATE TABLE `status` (
  `telegram_id` varchar(32) NOT NULL DEFAULT '',
  `register_stage` int(11) DEFAULT NULL,
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `telegram_id` (`telegram_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `telegram_id` varchar(32) NOT NULL DEFAULT '',
  `first_name` varchar(32) CHARACTER SET utf8 DEFAULT NULL,
  `last_name` varchar(32) CHARACTER SET utf8 DEFAULT NULL,
  `email` varchar(48) CHARACTER SET utf8 DEFAULT NULL,
  `mobile` varchar(32) CHARACTER SET utf8 DEFAULT NULL,
  `point` int(11) DEFAULT '0',
  PRIMARY KEY (`telegram_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
