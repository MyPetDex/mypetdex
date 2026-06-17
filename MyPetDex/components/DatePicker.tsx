import {
  View, Text, StyleSheet, Pressable, ActionSheetIOS, Platform,
} from "react-native";
import { useState, useEffect } from "react";

const BRAND = "#4CAF82";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const AMPM = ["AM", "PM"];

const currentYear = new Date().getFullYear();

interface DatePickerProps {
  label: string;
  value: string;           // "YYYY-MM-DD" or "YYYY-MM-DD HH:MM AM/PM"
  onChange: (value: string) => void;
  future?: boolean;
  showTime?: boolean;
}

export default function DatePicker({
  label, value, onChange, future = false, showTime = false,
}: DatePickerProps) {
  const YEARS = future
    ? Array.from({ length: 10 }, (_, i) => String(currentYear + i))
    : Array.from({ length: 10 }, (_, i) => String(currentYear - i));

  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState("08");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");

  useEffect(() => {
    if (value) {
      const [datePart, timePart] = value.split(" ");
      const parts = datePart.split("-");
      setYear(parts[0] || "");
      setMonth(parts[1] || "");
      setDay(parts[2] || "");
      if (timePart && showTime) {
        const [t, ap] = timePart.split(" ");
        if (t) {
          const [h, m] = t.split(":");
          setHour(h || "08");
          setMinute(m || "00");
        }
        if (ap) setAmpm(ap);
      }
    } else {
      setYear(""); setMonth(""); setDay("");
    }
  }, [value]);

  function notify(y: string, m: string, d: string, h: string, min: string, ap: string) {
    if (y && m && d) {
      const dateStr = `${y}-${m}-${d}`;
      if (showTime) {
        onChange(`${dateStr} ${h}:${min} ${ap}`);
      } else {
        onChange(dateStr);
      }
    }
  }

  function pick(title: string, options: string[], current: string, onPick: (val: string) => void) {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", ...options], cancelButtonIndex: 0, title },
        (idx) => { if (idx > 0) onPick(options[idx - 1]); }
      );
    }
  }

  function pickMonth() {
    pick("Select Month", MONTHS, MONTHS[parseInt(month) - 1] || "", (val) => {
      const m = String(MONTHS.indexOf(val) + 1).padStart(2, "0");
      setMonth(m); notify(year, m, day, hour, minute, ampm);
    });
  }
  function pickDay() {
    pick("Select Day", DAYS, day, (val) => {
      setDay(val); notify(year, month, val, hour, minute, ampm);
    });
  }
  function pickYear() {
    pick("Select Year", YEARS, year, (val) => {
      setYear(val); notify(val, month, day, hour, minute, ampm);
    });
  }
  function pickHour() {
    pick("Select Hour", HOURS, hour, (val) => {
      setHour(val); notify(year, month, day, val, minute, ampm);
    });
  }
  function pickMinute() {
    pick("Select Minute", MINUTES, minute, (val) => {
      setMinute(val); notify(year, month, day, hour, val, ampm);
    });
  }
  function pickAmpm() {
    pick("AM / PM", AMPM, ampm, (val) => {
      setAmpm(val); notify(year, month, day, hour, minute, val);
    });
  }

  const monthLabel = month ? MONTHS[parseInt(month) - 1] : "Month";
  const dayLabel   = day   || "Day";
  const yearLabel  = year  || "Year";

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {/* Date row */}
      <View style={styles.row}>
        <Pressable style={[styles.selector, { flex: 2 }]} onPress={pickMonth}>
          <Text style={[styles.selectorText, !month && styles.placeholder]}>{monthLabel}</Text>
          <Text style={styles.arrow}>▾</Text>
        </Pressable>
        <Pressable style={[styles.selector, { flex: 1 }]} onPress={pickDay}>
          <Text style={[styles.selectorText, !day && styles.placeholder]}>{dayLabel}</Text>
          <Text style={styles.arrow}>▾</Text>
        </Pressable>
        <Pressable style={[styles.selector, { flex: 1.5 }]} onPress={pickYear}>
          <Text style={[styles.selectorText, !year && styles.placeholder]}>{yearLabel}</Text>
          <Text style={styles.arrow}>▾</Text>
        </Pressable>
      </View>

      {/* Time row */}
      {showTime && (
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Time</Text>
          <View style={styles.row}>
            <Pressable style={[styles.selector, { flex: 1 }]} onPress={pickHour}>
              <Text style={styles.selectorText}>{hour}</Text>
              <Text style={styles.arrow}>▾</Text>
            </Pressable>
            <Text style={styles.timeSep}>:</Text>
            <Pressable style={[styles.selector, { flex: 1 }]} onPress={pickMinute}>
              <Text style={styles.selectorText}>{minute}</Text>
              <Text style={styles.arrow}>▾</Text>
            </Pressable>
            <Pressable style={[styles.selector, { flex: 1 }]} onPress={pickAmpm}>
              <Text style={styles.selectorText}>{ampm}</Text>
              <Text style={styles.arrow}>▾</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  selector: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorText: { fontSize: 14, color: "#1a1a1a", fontWeight: "500" },
  placeholder: { color: "#aaa" },
  arrow: { fontSize: 12, color: "#888" },
  timeRow: { marginTop: 10 },
  timeLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  timeSep: { fontSize: 18, color: "#555", fontWeight: "700" },
});
