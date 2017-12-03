import time
import sys
from icalendar import Calendar, Event
from datetime import datetime

cal_ics = open('data/example.ics')
gcal = Calendar.from_ical(cal_ics.read())
employee_dict = {}
for component in gcal.walk():
    if component.name == "VEVENT":
        start = component.get('dtstart')
        end = component.get('dtend')
        out = "duration: " + str(end.dt - start.dt)
        wage = str(15.75*((int(time.mktime(end.dt.timetuple()))
	    - int(time.mktime(start.dt.timetuple())))/3600))

        if employee_dict.has_key(component.get('summary')):
            employee_dict[component.get('summary')] = float(employee_dict[component.get('summary')]) + float(wage)
        else:
            employee_dict[component.get('summary')] = float(wage)

s = ""
for employee in employee_dict:
    s += employee + " " + str(employee_dict[employee]) + '; '
cal_ics.close()
print s
sys.stdout.flush()
