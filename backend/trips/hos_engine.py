from datetime import datetime, timedelta
import math

# Duty Statuses
DRIVING = "driving"
ON_DUTY_NOT_DRIVING = "on_duty_not_driving"
OFF_DUTY = "off_duty"
SLEEPER_BERTH = "sleeper_berth"

# Rules & Constants
AVG_SPEED_MPH = 55
MAX_DRIVING_IN_SHIFT = 11.0
MAX_WINDOW_IN_SHIFT = 14.0
MAX_DRIVING_WITHOUT_BREAK = 8.0
BREAK_DURATION = 0.5
REST_DURATION = 10.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_DURATION = 0.5
PICKUP_DURATION = 1.0
DROPOFF_DURATION = 1.0
CYCLE_LIMIT = 70.0
RESTART_DURATION = 34.0

class HOSEngine:
    def __init__(self, current_cycle_used, start_date=None):
        if start_date is None:
            # Default to 6 AM today
            start_date = datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)
        
        self.current_time = start_date
        self.cycle_hours_used = float(current_cycle_used)
        
        self.driving_in_shift = 0.0
        self.shift_start_time = start_date
        self.in_shift = True
        
        self.driving_since_break = 0.0
        self.miles_since_fuel = 0.0
        self.total_miles_driven = 0.0
        
        self.stops = []
        self.segments = [] # List of {status, start_time, end_time, location_name}
        
    def add_segment(self, status, duration_hours, location_name="En Route"):
        # Prevent zero-duration segments from cluttering logs
        if duration_hours <= 0.001:
            return

        # STRICT ENFORCEMENT: Cap driving if it would exceed 11h limit due to precision
        if status == DRIVING:
            rem_shift_drive = max(0.0, MAX_DRIVING_IN_SHIFT - self.driving_in_shift)
            if duration_hours > rem_shift_drive:
                duration_hours = rem_shift_drive

        start_time = self.current_time
        end_time = start_time + timedelta(hours=duration_hours)
        
        # Split segment if it crosses midnight
        temp_start = start_time
        while temp_start.date() < end_time.date():
            midnight = (temp_start + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            duration_to_midnight = (midnight - temp_start).total_seconds() / 3600.0
            if duration_to_midnight > 0.001:
                self.segments.append({
                    "status": status,
                    "start_time": temp_start,
                    "end_time": midnight,
                    "location": location_name
                })
            temp_start = midnight
            
        if temp_start < end_time:
            self.segments.append({
                "status": status,
                "start_time": temp_start,
                "end_time": end_time,
                "location": location_name
            })
            
        if status != OFF_DUTY and status != SLEEPER_BERTH:
            self.start_shift_if_needed()
            
        self.current_time = end_time
        
        # --- HOS Clock Updates ---
        if status == DRIVING:
            self.driving_in_shift += duration_hours
            self.driving_since_break += duration_hours
            self.cycle_hours_used += duration_hours
        elif status == ON_DUTY_NOT_DRIVING:
            self.cycle_hours_used += duration_hours
            
        # --- HOS Clock Resets ---
        # 1. 30-Minute Break Rule: Reset 8-hour clock if non-driving for 30+ mins
        if status != DRIVING and duration_hours >= BREAK_DURATION:
            self.driving_since_break = 0.0
            
        # 2. 10-Hour Rest Rule: Reset 14-hour shift clock and 11-hour driving limit
        if (status == OFF_DUTY or status == SLEEPER_BERTH) and duration_hours >= REST_DURATION:
            self.driving_in_shift = 0.0
            self.shift_start_time = self.current_time
            self.in_shift = False 
            self.driving_since_break = 0.0
            
        # 3. 34-Hour Restart Rule: Reset weekly cycle
        if (status == OFF_DUTY or status == SLEEPER_BERTH) and duration_hours >= RESTART_DURATION:
            self.cycle_hours_used = 0.0
            
    def start_shift_if_needed(self):
        if not self.in_shift:
            self.shift_start_time = self.current_time
            self.in_shift = True

    def process_driving_leg(self, distance_miles, route_points, leg_name="Leg"):
        miles_remaining = distance_miles
        
        while miles_remaining > 0.1:
            self.start_shift_if_needed()
            
            # Constraints
            can_drive_11 = max(0.0, MAX_DRIVING_IN_SHIFT - self.driving_in_shift)
            
            window_used = (self.current_time - self.shift_start_time).total_seconds() / 3600.0
            can_drive_14 = max(0.0, MAX_WINDOW_IN_SHIFT - window_used)
            
            can_drive_8 = max(0.0, MAX_DRIVING_WITHOUT_BREAK - self.driving_since_break)
            can_drive_70 = max(0.0, CYCLE_LIMIT - self.cycle_hours_used)
            
            miles_to_fuel = max(0.0, FUEL_INTERVAL_MILES - self.miles_since_fuel)
            can_drive_fuel = miles_to_fuel / AVG_SPEED_MPH
            
            can_drive_hours = min(can_drive_11, can_drive_14, can_drive_8, can_drive_70, can_drive_fuel)
            hours_to_finish = miles_remaining / AVG_SPEED_MPH
            
            drive_hours = min(can_drive_hours, hours_to_finish)
            
            if drive_hours > 0.01:
                self.add_segment(DRIVING, drive_hours, location_name=f"Driving - En route toward {leg_name}")
                miles_remaining -= (drive_hours * AVG_SPEED_MPH)
                self.miles_since_fuel += (drive_hours * AVG_SPEED_MPH)
                self.total_miles_driven += (drive_hours * AVG_SPEED_MPH)
            else:
                # If we can't drive but have miles left, we MUST trigger a stop
                miles_remaining = max(0.0, miles_remaining) # Safety
                
            if miles_remaining > 0.1:
                if self.cycle_hours_used >= CYCLE_LIMIT:
                    self.add_stop("restart_34hr", RESTART_DURATION, OFF_DUTY, name="34hr Restart")
                elif self.driving_in_shift >= MAX_DRIVING_IN_SHIFT or (self.current_time - self.shift_start_time).total_seconds() / 3600.0 >= MAX_WINDOW_IN_SHIFT:
                    self.add_stop("rest_10hr", REST_DURATION, OFF_DUTY, name="10hr Rest")
                elif self.driving_since_break >= MAX_DRIVING_WITHOUT_BREAK:
                    self.add_stop("break_30min", BREAK_DURATION, OFF_DUTY, name="30min Break")
                elif self.miles_since_fuel >= FUEL_INTERVAL_MILES:
                    self.add_stop("fuel", FUEL_DURATION, ON_DUTY_NOT_DRIVING, name="Fuel Stop")
                    self.miles_since_fuel = 0.0
                else:
                    # Generic safety rest if multiple clocks are tight
                    self.add_stop("rest_10hr", REST_DURATION, OFF_DUTY, name="Safety Rest")

    def add_stop(self, stop_type, duration, status, name="Stop"):
        arrival = self.current_time
        # Clean up stop name for remarks
        display_name = name.replace("Stop", "").strip()
        
        # Determine specific remark prefix based on stop type
        if stop_type == "pickup":
            remark = f"Pickup: {display_name}"
        elif stop_type == "dropoff":
            remark = f"Dropoff: {display_name}"
        elif stop_type == "fuel":
            remark = f"Fueling - {display_name}"
        else:
            remark = f"Stop: {display_name}"

        # CRITICAL: Always ensure On Duty status for stops
        self.add_segment(status, duration, location_name=remark)
        departure = self.current_time
        
        self.stops.append({
            "type": stop_type,
            "name": display_name,
            "arrival": arrival.isoformat(),
            "departure": departure.isoformat(),
            "duration": duration,
            "duty_status": status,
            "distance_at_stop": self.total_miles_driven
        })

    def get_day_logs(self):
        day_logs_raw = {}
        for seg in self.segments:
            day_str = seg["start_time"].strftime("%Y-%m-%d")
            if day_str not in day_logs_raw:
                day_logs_raw[day_str] = []
            
            start_hour = seg["start_time"].hour + seg["start_time"].minute / 60.0
            end_hour = seg["end_time"].hour + seg["end_time"].minute / 60.0
            
            # Handle midnight wrap
            if seg["end_time"].hour == 0 and seg["end_time"].minute == 0 and seg["end_time"].date() > seg["start_time"].date():
                end_hour = 24.0
                
            day_logs_raw[day_str].append({
                "status": seg["status"],
                "start_hour": round(start_hour, 2),
                "end_hour": round(end_hour, 2),
                "location": seg["location"]
            })
            
        result = []
        for day in sorted(day_logs_raw.keys()):
            segments = sorted(day_logs_raw[day], key=lambda x: x["start_hour"])
            
            # --- Priority 1 Fix: Backfill Midnight ---
            if segments and segments[0]["start_hour"] > 0:
                segments.insert(0, {
                    "status": OFF_DUTY,
                    "start_hour": 0.0,
                    "end_hour": segments[0]["start_hour"],
                    "location": "Midnight Start"
                })
            
            # Ensure total is 24h
            if segments and segments[-1]["end_hour"] < 24.0:
                segments.append({
                    "status": segments[-1]["status"],
                    "start_hour": segments[-1]["end_hour"],
                    "end_hour": 24.0,
                    "location": segments[-1]["location"]
                })
                
            result.append({
                "date": day,
                "segments": segments
            })
        return result

def plan_trip(current_loc, pickup_loc, dropoff_loc, current_cycle_used, route_data):
    engine = HOSEngine(current_cycle_used)
    
    # 1. Start Location (Ensure some duration or it won't show a line)
    engine.add_stop("current_location", 0.1, ON_DUTY_NOT_DRIVING, name=current_loc["name"])
    
    # 2. Leg 1: Current to Pickup
    engine.process_driving_leg(route_data["leg1_distance"], route_data["geometry"], leg_name=pickup_loc['name'])
    
    # 3. Pickup
    engine.add_stop("pickup", PICKUP_DURATION, ON_DUTY_NOT_DRIVING, name=pickup_loc["name"])
    
    # 4. Leg 2: Pickup to Dropoff
    engine.process_driving_leg(route_data["leg2_distance"], route_data["geometry"], leg_name=dropoff_loc['name'])
    
    # 5. Dropoff
    engine.add_stop("dropoff", DROPOFF_DURATION, ON_DUTY_NOT_DRIVING, name=dropoff_loc["name"])
    
    # Summary calculation
    total_drive = 0
    total_rest = 0
    for seg in engine.segments:
        dur = (seg["end_time"] - seg["start_time"]).total_seconds() / 3600.0
        if seg["status"] == DRIVING: total_drive += dur
        if seg["status"] in [OFF_DUTY, SLEEPER_BERTH]: total_rest += dur

    return {
        "stops": engine.stops,
        "day_logs": engine.get_day_logs(),
        "summary": {
            "total_miles": round(route_data["total_distance"], 1),
            "total_days": len(engine.get_day_logs()),
            "total_driving_hours": round(total_drive, 1),
            "total_rest_hours": round(total_rest, 1),
            "cycle_hours_remaining": round(max(0.0, CYCLE_LIMIT - engine.cycle_hours_used), 1)
        }
    }
