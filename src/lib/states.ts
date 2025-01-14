import {ModbusDatatype} from './modbus/modbus_types';
import {InverterStatus, MeterStatus, StorageStatus} from './state_enums';
import {AdapterInstance} from '@iobroker/adapter-core';
import {ModbusDevice} from './modbus/modbus_device';

type MapperFn = (value: any) => Promise<string>

interface DataField {
    interval?: UpdateIntervalID;
    state: State;
    register: ModbusRegister;
    mapper?: MapperFn
}

interface StateToUpdate {
    id: string,
    value: any
}

interface State {
    id: string;
    name: string
    type: ioBroker.CommonType;
    role: string
    unit?: string;
    desc?: string;
}

interface ModbusRegister {
    reg: number;
    type: ModbusDatatype;
    length: number;
    gain?: number;
}

export enum UpdateIntervalID {
    HIGH,
    LOW
}

interface UpdateIntervals {
    intervals: number[];
}

export class InverterStates {

    private updateIntervals: UpdateIntervals
    private readonly dataFields: DataField[];
    // private changingFields: DataField[];

    constructor(updateIntervals: UpdateIntervals) {
        this.updateIntervals = updateIntervals
        this.dataFields = [
            // initial fields - no repetitive update
            {
                state: {id: 'info.model', name: 'Model', type: 'string', role: 'state'},
                register: {reg: 30000, type: ModbusDatatype.string, length: 15}
            },
            {
                state: {id: 'info.modelID', name: 'Model ID', type: 'number', role: 'state'},
                register: {reg: 30070, type: ModbusDatatype.uint16, length: 1}
            },
            {
                state: {id: 'info.serialNumber', name: 'Serial number', type: 'string', role: 'state'},
                register: {reg: 30015, type: ModbusDatatype.string, length: 10}
            },
            {
                state: {id: 'info.ratedPower', name: 'Rated power', type: 'number', unit: 'W', role: 'state'},
                register: {reg: 30073, type: ModbusDatatype.int32, length: 2}
            },
            {
                state: {id: 'info.numberMPPTrackers', name: 'Number of MPP trackers', type: 'number', unit: '', role: 'state'},
                register: {reg: 30072, type: ModbusDatatype.uint16, length: 1, gain: 1}
            },

            // inverter
            {
                interval: UpdateIntervalID.HIGH,
                state: {id: 'activePower', name: 'Active power', type: 'number', unit: 'W', role: 'value.power', desc: 'Power currently used'},
                register: {reg: 32080, type: ModbusDatatype.int32, length: 2}
            },
            {
                interval: UpdateIntervalID.HIGH,
                state: {id: 'inputPower', name: 'Input power', type: 'number', unit: 'W', role: 'value.power', desc: 'Power from PV'},
                register: {reg: 32064, type: ModbusDatatype.int32, length: 2}
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'peakActivePowerCurrenDay', name: 'Peak active power of current day', type: 'number', unit: 'W', role: 'value.power.max'},
                register: {reg: 32078, type: ModbusDatatype.int32, length: 2}
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'efficiency', name: 'Efficiency', type: 'number', unit: '%', role: 'value.efficiency'},
                register: {reg: 32086, type: ModbusDatatype.uint16, length: 1, gain: 100}
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'internalTemperature', name: 'Internal temperature', type: 'number', unit: '°C', role: 'value.temp'},
                register: {reg: 32087, type: ModbusDatatype.int16, length: 1, gain: 10}
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'deviceStaus', name: 'Device status', type: 'string', unit: '', role: 'value.status'},
                register: {reg: 32089, type: ModbusDatatype.uint16, length: 1},
                mapper: value => Promise.resolve(InverterStatus[value])
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'accumulatedEnergyYield', name: 'Accumulated energy yield', type: 'number', unit: 'kWh', role: 'value'},
                register: {reg: 32106, type: ModbusDatatype.uint32, length: 2, gain: 100},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'dailyEnergyYield', name: 'Daily energy yield', type: 'number', unit: 'kWh', role: 'value'},
                register: {reg: 32114, type: ModbusDatatype.uint32, length: 2, gain: 100}
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'PV1Voltage', name: 'PV1 voltage', type: 'number', unit: 'V', role: 'value.voltage'},
                register: {reg: 32016, type: ModbusDatatype.int16, length: 1, gain: 10}
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'PV1Current', name: 'PV1 current', type: 'number', unit: 'A', role: 'value.current'},
                register: {reg: 32017, type: ModbusDatatype.int16, length: 1, gain: 100}
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'PV2Voltage', name: 'PV2 voltage', type: 'number', unit: 'V', role: 'value.voltage'},
                register: {reg: 32018, type: ModbusDatatype.int16, length: 1, gain: 10}
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'PV2Current', name: 'PV2 current', type: 'number', unit: 'A', role: 'value.current'},
                register: {reg: 32019, type: ModbusDatatype.int16, length: 1, gain: 100}
            },

            // storage
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'storage.runningState', name: 'Running state', type: 'string', role: 'value'},
                register: {reg: 37762, type: ModbusDatatype.uint16, length: 1},
                mapper: value => Promise.resolve(StorageStatus[value])
            },
            {
                interval: UpdateIntervalID.HIGH,
                state: {id: 'storage.stateOfCapacity', name: 'State of capacity', type: 'number', unit: '%', role: 'value.capacity', desc: 'SOC'},
                register: {reg: 37760, type: ModbusDatatype.uint16, length: 1, gain: 10}
            },
            {
                interval: UpdateIntervalID.HIGH,
                state: {id: 'storage.chargeDischargePower', name: 'Charge/Discharge power', desc: '(>0 charging, <0 discharging)', type: 'number', unit: 'W', role: 'value.power'},
                register: {reg: 37765, type: ModbusDatatype.int32, length: 2}
            },
            // <TODOO date="31.08.2023" author="Stephan Bechter">
            // TODO: add Charge discharge capacity per day
            // </TODOO>

            // grid (meter)
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.meterStatus', name: 'Meter status', type: 'string', role: 'value.status'},
                register: {reg: 37100, type: ModbusDatatype.uint16, length: 1},
                mapper: value => Promise.resolve(MeterStatus[value])
            },
            {
                interval: UpdateIntervalID.HIGH,
                state: {id: 'grid.activePower', name: 'Active power', type: 'number', role: 'value.power', unit: 'W', desc: '(>0 feed-in to the power grid, <0: supply from the power grid)'},
                register: {reg: 37113, type: ModbusDatatype.int32, length: 2},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.reactivePower', name: 'Reactive power', type: 'number', role: 'value.power', unit: 'W'},
                register: {reg: 37115, type: ModbusDatatype.int32, length: 2},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.powerFactor', name: 'Power factor', type: 'number', role: 'value.power.factor', unit: ''},
                register: {reg: 37117, type: ModbusDatatype.int16, length: 1, gain: 1000},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.gridFrequency', name: 'Grid frequency', type: 'number', role: 'value.frequency', unit: 'Hz'},
                register: {reg: 37118, type: ModbusDatatype.int16, length: 1, gain: 100},
            },

            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.phase1Voltage', name: 'Phase 1 voltage', type: 'number', role: 'value.voltage', unit: 'V', desc: 'also L1, or R voltage'},
                register: {reg: 37101, type: ModbusDatatype.int32, length: 2, gain: 10},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.phase2Voltage', name: 'Phase 2 voltage', type: 'number', role: 'value.voltage', unit: 'V', desc: 'also L2, or S voltage'},
                register: {reg: 37103, type: ModbusDatatype.int32, length: 2, gain: 10},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.phase3Voltage', name: 'Phase 3 voltage', type: 'number', role: 'value.voltage', unit: 'V', desc: 'also L3, or T voltage'},
                register: {reg: 37105, type: ModbusDatatype.int32, length: 2, gain: 10},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.phase1Current', name: 'Phase 1 current', type: 'number', role: 'value.current', unit: 'A'},
                register: {reg: 37107, type: ModbusDatatype.int32, length: 2, gain: 100},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.phase2Current', name: 'Phase 2 current', type: 'number', role: 'value.current', unit: 'A'},
                register: {reg: 37109, type: ModbusDatatype.int32, length: 2, gain: 100},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.phase3Current', name: 'Phase 3 current', type: 'number', role: 'value.current', unit: 'A'},
                register: {reg: 37111, type: ModbusDatatype.int32, length: 2, gain: 100},
            },

            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.positiveActivePower', name: 'Positive active power', type: 'number', role: 'value.power', unit: 'kWh', desc: 'Electricity fed by the inverter to the power grid.'},
                register: {reg: 37119, type: ModbusDatatype.int32, length: 2, gain: 100},
            },
            {
                interval: UpdateIntervalID.LOW,
                state: {id: 'grid.reverseActivePower', name: 'Reverse active power', type: 'number', role: 'value.power', unit: 'kWh', desc: 'Power supplied from the power grid.'},
                register: {reg: 37121, type: ModbusDatatype.int32, length: 2, gain: 100},
            },
        ];
    }

    public async createStates(adapter: AdapterInstance): Promise<void> {
        for (const field of this.dataFields) {
            const state = field.state
            await adapter.setObjectNotExistsAsync(state.id, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    unit: state.unit,
                    desc: state.desc,
                    read: true,
                    write: false
                },
                native: {},
            });
        }
    }


    public async updateStates(adapter: AdapterInstance, device: ModbusDevice, interval?: UpdateIntervalID): Promise<number> {
        const toUpdate: StateToUpdate[] = [];
        for (const field of this.dataFields) {
            if (field.interval != interval) {
                continue;
            }
            try {
                let value = await device.readModbusHR(field.register.reg, field.register.type, field.register.length);

                if (field.register.gain) {
                    value /= field.register.gain;
                }
                if (field.mapper) {
                    value = await field.mapper(value);
                }
                toUpdate.push({id: field.state.id, value: value});
            } catch (e) {
                adapter.log.warn(`Error while reading from ${device.getIpAddress()}: [${field.register.reg}|${field.register.length}] '' with : ${e}`);
                break;
            }
        }

        for (const stateToUpdate of toUpdate) {
            if (stateToUpdate.value !== null) {
                await adapter.setStateAsync(stateToUpdate.id, {val: stateToUpdate.value, ack: true});
                adapter.log.silly(`Synced value ${stateToUpdate.id}, val=[${stateToUpdate.value}]`);
            }
        }
        return Promise.resolve(toUpdate.length);
    }
}
