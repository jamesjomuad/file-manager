ln -s /var/www/dev/booking dev-booking

chown -R ubuntu:ubuntu /var/www/dev/wp-content/

sudo tail -f /var/log/apache2/realresponse_access.log

sudo systemctl status laravel-echo
sudo systemctl restart mysql && sudo systemctl restart apache2      # Restart web server
sudo systemctl stop mysql
sudo systemctl start mysql
sudo systemctl status mysql
sudo service apache2 restart
sudo systemctl restart apache2
sudo systemctl restart php8.4-fpm
sudo systemctl restart php7.4-fpm
sudo service php8.0-fpm restart
sudo systemctl restart apache2 && sudo systemctl restart php7.4-fpm && sudo systemctl restart php8.0-fpm
sudo apache2ctl -t                  # Check your server configuration 
sudo apache2ctl -S                  # List All Virtual Hosts Served by Apache2
sudo apache2ctl configtest          # Check your server configuration 
systemctl list-units --type=service | grep php      # PHP-FPM service is running


# Enable apache site
sudo a2ensite n8n.dev.realresponse.com.au.conf  # Enable a vhost/site
# Disable apache site
sudo a2dissite n8n.dev.realresponse.com.au.conf  # Disable a vhost/site


# Enable MOD
sudo a2enmod file_cache cache
sudo a2enmod php8.1
# Disable MOD
sudo a2dismod file_cache cache
sudo a2dismod php8.2

# clean up old PHP 7.4 configs and FPM services
sudo a2dismod php7.4
sudo systemctl stop php7.4-fpm
sudo systemctl disable php7.4-fpm
sudo systemctl reload apache2


# SSL get a certificate
sudo certbot --apache
sudo certbot certonly --apache
sudo certbot renew --dry-run
sudo certbot --force-renewal -d safetyfirstaid.com.au     # Renew or create cert, it auto create vhost
sudo certbot -d safetyfirstaid.com.au --manual --preferred-challenges dns certonly
sudo certbot certificates
sudo certbot --apache -d realresponse.com.au -d www.realresponse.com.au


# mysql config
nano /etc/mysql/mysql.conf.d/mysqld.cnf


# Grant CREATE & ALTER PROCEDURE Privileges
GRANT CREATE ROUTINE, ALTER ROUTINE ON *.* TO 'dev'@'localhost';
FLUSH PRIVILEGES;


# Check apache error logs
sudo grep -i -r error /var/log/apache2/

# Reboot
sudo reboot

# Bitnami, restart apache
sudo /opt/bitnami/ctlscript.sh restart apache2
sudo /opt/bitnami/ctlscript.sh restart

# Bitnami cert tool
sudo /opt/bitnami/bncert-tool


# Find Biggest Files and Directories
du -ah ./ | sort -n -r | head -n 5
du -x -h ./ | sort -h | tail -40

# Check available disk space
df -h
df -k

# ZIP folder
zip -r filename.zip dir/

# Remove binlog before date
PURGE BINARY LOGS BEFORE '2022-07-26 00:12:23'

# Dump sql
mysqldump -u root -p database_name > backup.sql

# Restore dump sql
mysql -u root -p database_name < backup.sql

# Check system usage
htop
free -h
vmstat -s

# Current shell
echo $SHELL

# Change shells
chsh -s /bin/zsh
chsh -s /bin/bash


# Webmin 
sudo systemctl status webmin
sudo /etc/webmin/stop
sudo /etc/webmin/start
sudo /etc/webmin/restart
sudo  /etc/init.d/webmin restart

# Webmin IP access control
sudo vi /etc/webmin/miniserv.conf

# Webmin reset password
sudo /usr/share/webmin/changepass.pl /etc/webmin ubuntu tL4EHILvuD3M         # Qb83JW6AVkHWlRd


# Set the default PHP version
update-alternatives --config php 


# GIT
sudo chown -R $(whoami) .       # reclaim ownership of the entire current directory, not just the hidden .git folder
vi ~/.gitconfig                 # Edit global config
git reset --hard $COMMIT        // $COMMIT is the commit id like 'd2ff796f306b105e8259194818039f1eca260e86'
git reset HEAD // Undo

git fetch origin                # Same version from remote
git reset --hard origin/staging    # Same version from remote

git remote prune origin --dry-run
git remote prune origin         # This command removes remote-tracking branches that no longer exist on the remote repository.
git fetch --prune               # Remove all local remote-tracking branches that are no longer on the remote repository

git branch -d staging           # Remove local branch

git remote set-url origin git@github.com:jamesjomuad/wp-realresponse.git     # Set remote url
git remote add origin git@github.com:jamesjomuad/wp-realresponse.git

git remote -v                   # Basic Remote Info
git remote show origin          # Detailed Remote Info




# WP Cron
wget -q -O - https://yourwebsite.com/wp-cron.php?doing_wp_cron >/dev/null 2>&1




# ClamAV 
# https://upcloud.com/resources/tutorials/scan-ubuntu-server-malware
sudo systemctl status clamav-freshclam
sudo systemctl stop clamav-freshclam
sudo systemctl start clamav-freshclam
sudo systemctl enable clamav-freshclam
sudo freshclam      # run the updater application.
sudo clamscan -r ./
sudo clamscan --infected --remove --recursive /home
sudo clamscan --infected --recursive --exclude-dir="^/sys" /        # Perform a complete scan
sudo systemctl stop clamav-daemon
sudo systemctl start clamav-daemon
sudo systemctl status clamav-daemon

# Search file text content
grep -r "bogart-analytics.test" /path/to/directory
grep -rnw '/var/www/' -e 'keyword'      # Search file word


#   Block ip address, note: Never use /8
sudo iptables -A INPUT -s 34.174.56.20  -j DROP
sudo iptables -A INPUT -s 52.169.0.0/16 -j DROP
sudo iptables -A INPUT -s 172.69.134.0/24 -j DROP
#   List all blocked IP
sudo iptables -L --line-numbers
#   Unblock IP address, replace N accordingly
sudo iptables -D INPUT 15
#   Make it Persistent 
sudo iptables-save | sudo tee /etc/iptables/rules.v4


# Swapfile check
free -h


# n8n
~/n8n-update.sh                             # Update n8n 
sudo journalctl -u n8n -n 50 -f             # shows logs for the n8n service
sudo journalctl -u n8n-worker -f 
sudo journalctl -u n8n -u n8n-worker -f     # Tip: For combined output of both main and worker. This shows live logs from both services in one stream.
sudo systemctl status n8n
sudo systemctl status n8n-worker
sudo systemctl stop n8n-worker n8n
sudo systemctl start n8n-worker n8n
sudo systemctl start n8n
sudo systemctl start n8n-worker
sudo systemctl status n8n-worker-restart.timer
sudo systemctl status n8n-worker-restart.service
ss -lntp | grep 5678  # Check ports: n8n main UI
ss -lntp | grep 5679  # Check ports: Task Broker


# Identify Large Files and Directories
sudo du -h --max-depth=1

# Quick Server
http-server -o ./


# Apache Benchmarkeng Tool
ab -n 1000 -c 10 http://example.com/        # send 1000 requests with a concurrency of 10 to http://example.com/
ab -n 1000 -c 5 -C "somecookie=rawr" http://52.62.2.135/dev.realresponse.com.au


# Configure update-alternatives to use a different PHP version
sudo update-alternatives --config php

# Install nodejs 
nvm install 18.20.3             # Install version
nvm use 18.20.3                 # Use Node.js Version 18.20.3
nvm alias default 18.20.3       # Set as Default (Optional)


# pm2
pm2 start ecosystem.config.js       # Start all applications
pm2 stop ecosystem.config.js        # Stop all
pm2 reload ecosystem.config.js 
pm2 start process.json --env production
pm2 restart process.json --env development

# Composer 
sudo update-alternatives --config php   # Switch php version


# Supervisor
sudo supervisorctl stop laravel-workers:*
sudo supervisorctl start laravel-workers:*
sudo supervisorctl restart laravel-workers:*
sudo supervisorctl status	        #View status of all programs
sudo supervisorctl stop all     	#Stop all programs
sudo supervisorctl start all	    #Start all programs
sudo supervisorctl restart all
sudo supervisorctl status soketi
sudo supervisorctl restart soketi	#Restart a specific program
sudo supervisorctl reread	        #Detect changes in config files
sudo supervisorctl update	        #Apply reread changes
# Reload Supervisor to apply changes:
sudo supervisorctl reread
sudo supervisorctl update
# Ensure the worker process is not running:
sudo supervisorctl stop portal-worker:*
# Check Running Processes
ps aux | grep "php artisan queue:work"
# Kill the process by PID:
sudo kill -9 <PID>


# Redis Usage
redis-cli info stats
redis-cli info
redis-cli monitor
redis-cli FLUSHALL
sudo systemctl restart redis


#   Set laravel directories
sudo chown -R $USER:www-data storage
sudo chown -R $USER:www-data bootstrap/cache
chmod -R 775 storage
chmod -R 775 bootstrap/cache



# fail2ban
sudo tail -f /var/log/fail2ban.log      # Monitor
sudo fail2ban-client set apache unbanip 192.168.254.137     # unban
sudo journalctl -u fail2ban     # Fail2ban log messages
sudo systemctl status fail2ban
sudo systemctl stop fail2ban
sudo iptables -L -n -v          # View rules
zgrep -h "Ban " /var/log/fail2ban.log* | awk '{print $1}' | cut -d- -f1,2 | sort | uniq -c      # Command to See Your Attacks by Month

## Test Filter - fail2ban-regex <log file> <filter> <ignore-filter>
fail2ban-regex /var/log/apache2/access.log /etc/fail2ban/filter.d/apache-ratelimit.conf     

## Test the filter:
sudo fail2ban-client status apache-404              # This shows currently banned IPs.
sudo fail2ban-client status apache-ratelimit        # This shows currently banned IPs.
sudo fail2ban-client status wordpress-scanners      # This shows currently banned IPs.
sudo fail2ban-client status wordpress-scanners > ~/fail2ban-wordpress-scanners.log
sudo fail2ban-client status env-access > ~/env-access.log



# Monitor attacks 
# You can quickly see top attacking IPs:
awk '{print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -nr | head


# Set php version
sudo update-alternatives --set php /usr/bin/php8.4


# MySQL way to limit a user to a specific database.
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'limited_user'@'localhost';        # Removes all privileges, including SHOW DATABASES and global access.
GRANT ALL PRIVILEGES ON my_database.* TO 'limited_user'@'localhost';        # Grant privileges only on the specific database
FLUSH PRIVILEGES;



# Find top 20 largest files in current directory
find . -type f -exec du -sh {} + | sort -rh | head -20
# Find largest files from root
find / -type f -exec du -sh {} + | sort -rh | head -20
# Specific directory
find /var/www/html -type f -exec du -sh {} + | sort -rh | head -20


# WP cli: Use wp search-replace to swap URLs in the database:
wp search-replace 'https://old-domain.com' 'https://new-domain.com' --all-tables

# Common options:
# --dry-run — Preview changes without applying them (always run this first)
# --all-tables — Include non-standard WP tables
# --precise — Use PHP serialization-safe replacements (handles serialized data)
# --skip-columns=guid — Skip the guid column (recommended for post GUIDs)

# Typical workflow:

# 1. Preview changes
wp search-replace 'prod.realresponse.com.au' 'realresponse.com.au' --all-tables --dry-run

# 2. Apply changes
wp search-replace 'prod.realresponse.com.au' 'realresponse.com.au' --all-tables --skip-columns=guid

# 3. Flush cache
wp cache flush

# Portal Deployment workflow
vendor/bin/dep deploy dev
sudo supervisorctl status
sudo supervisorctl restart all
sudo supervisorctl restart soketi
sudo systemctl restart php8.4-fpm
php artisan queue:restart

php vendor/bin/dep rollback dev


# Watch all incoming requests
sudo tail -f /var/log/apache2/prod.realresponse.com.au_access.log

# Watch only suspicious WordPress requests
sudo tail -f /var/log/apache2/prod.realresponse.com.au_access.log | grep --line-buffered -Ei 'wp-includes/core\.php|wp-atom\.php|adminfuns\.php|worksec\.php|goods\.php|upload\.php|/backup|/\.env'