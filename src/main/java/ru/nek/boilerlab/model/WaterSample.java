package ru.nek.boilerlab.model;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Сущность замера качества воды водно-химического режима
 */
public class WaterSample implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private LocalDateTime timestamp;
    private SamplePoint point;
    private String equipment;
    private int shift;
    private String technician;
    private Map<String, Double> values = new HashMap<>();
    private SampleStatus status;
    private String notes;

    public WaterSample() {}

    public WaterSample(String id, SamplePoint point, String equipment, int shift, String technician) {
        this.id = id;
        this.point = point;
        this.equipment = equipment;
        this.shift = shift;
        this.technician = technician;
        this.timestamp = LocalDateTime.now();
        this.status = SampleStatus.NORMAL;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public SamplePoint getPoint() { return point; }
    public void setPoint(SamplePoint point) { this.point = point; }

    public String getEquipment() { return equipment; }
    public void setEquipment(String equipment) { this.equipment = equipment; }

    public int getShift() { return shift; }
    public void setShift(int shift) { this.shift = shift; }

    public String getTechnician() { return technician; }
    public void setTechnician(String technician) { this.technician = technician; }

    public Map<String, Double> getValues() { return values; }
    public void setValues(Map<String, Double> values) { this.values = values; }

    public void addValue(String parameter, Double value) {
        this.values.put(parameter, value);
    }

    public SampleStatus getStatus() { return status; }
    public void setStatus(SampleStatus status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
