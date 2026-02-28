#include "ClearCore.h"
#include <math.h>

#define VERSION "0000000000000000000000000000000000000000"

// Serial constants.
#define BAUD_RATE 115200
#define BUFFER_SIZE 1000
#define DELIMITER ";"

// Expansion board constants.
#define CcioPort ConnectorCOM0

// Motor constants.
#define MOTOR_COUNT 4
#define M0 ConnectorM0
#define M1 ConnectorM1
#define M2 ConnectorM2
#define M3 ConnectorM3
MotorDriver *MOTORS[] = {&M0, &M1, &M2, &M3};

// Sensor constants.
#define ADC_RESOLUTION 12
#define CLEARCORE_PORT_COUNT 13
Connector *CLEARCORE_PORTS[] = {&ConnectorIO0, &ConnectorIO1, &ConnectorIO2, &ConnectorIO3, &ConnectorIO4, &ConnectorIO5, &ConnectorDI6, &ConnectorDI7, &ConnectorDI8, &ConnectorA9, &ConnectorA10, &ConnectorA11, &ConnectorA12};

// Absolute encoder constants.
// Chip datasheet: https://www.rls.si/eng/fileuploader/download/download/?d=1&id=90&title=Data+sheet%3A+AM8192B+%E2%80%93+angular+magnetic+sensor+chip+%28AM8192BD01%29
// Encoder datasheet: https://www.rls.si/eng/fileuploader/download/download/?d=1&id=43&title=Data+sheet%3A+RM36+rotary+magnetic+encoder+%28RM36D01%29
// Encoder needs to be connected in the following way (Encoder -> ClearCore):
//      Clock -> COM[N]_SCK
//      Clock- -> GND
//      Vdd -> 5V
//      Data -> COM[N]_MISO
//      GND -> GND
// Baud rate needs to be roughly between 240000 and 400000 to match what the encoder chip supports
#define ABS_ENCODER_BAUD_RATE 260000
// Clock polarity (chip is idle when high)
#define ABS_ENCODER_CLOCK_POLARITY SerialDriver::SCK_HIGH
// Clock phase (sample data when clock goes from high to low)
#define ABS_ENCODER_CLOCK_PHASE SerialDriver::LEAD_CHANGE
// Char size (only works with 9)
#define ABS_ENCODER_CHAR_SIZE 9
// Connect encoder to COM1
#define AbsEncoderPort ConnectorCOM1

typedef enum
{
  OK = 0,
  ERR_COMMAND_UNKNOWN,
  ERR_PORT_UNAVAILABLE,
  ERR_PORT_MODE_INVALID,
  ERR_ABS_ENCODER_NOT_CONNECTED,
} error;

typedef enum
{
  PORT_MODE_DIGITAL_INPUT = 0,
  PORT_MODE_DIGITAL_OUTPUT,
  PORT_MODE_ANALOG_INPUT,
  PORT_MODE_ANALOG_OUTPUT,
  PORT_MODE_LAST,
} port_mode;

// Serial input accumulator.
uint32_t serialCurrentByte;

// Serial command buffer and cursor location.
char *buffer = (char *)calloc(sizeof(char), BUFFER_SIZE);
uint32_t cursor = 0;

bool selectorValid(uint32_t selector, uint32_t portCount)
{
  return selector < (2 << (portCount - 1));
}

bool selectorMatchesAnalog(uint32_t selector)
{
  // Only clearcore ports between A9 and A12 are analog. The rest are digital.
  // Check that only those pins in selector are set to 1.
  return (selector & 0b1111000000000) == selector;
}

error getVersion(uint32_t args[], char *response)
{
  char versionBytes[] = VERSION;

  // Iterate over the versionBytes by two bytes at a time.
  for (uint32_t i = 0; i < sizeof(versionBytes) - 1; i += 2)
  {
    // Convert the two bytes to a single uint32_t.
    char tmp[] = {versionBytes[i], versionBytes[i + 1]};
    uint32_t currentByte = (uint32_t)strtol(tmp, NULL, 16);

    // Convert the uint32_t to a string and concat it into the response.
    char *versionStr = (char *)malloc(8 * sizeof(char));
    sprintf(versionStr, "%d;", currentByte);
    strcat(response, versionStr);
    free(versionStr);
  }
}

Connector *getPort(uint32_t index)
{
  if (index < CLEARCORE_PORT_COUNT)
  {
    return CLEARCORE_PORTS[index];
  }
  else
  {
    int expansionBoardIndex = index - CLEARCORE_PORT_COUNT;
    return CcioMgr.PinByIndex(static_cast<ClearCorePins>(CLEARCORE_PIN_CCIOA0 + expansionBoardIndex));
  }
}

error getMotorsState(uint32_t args[], char *response)
{
  uint32_t selector = args[0];

  // Iterate over motors.
  for (uint32_t i = 0; i < MOTOR_COUNT; ++i)
  {
    // Ignore motors not selected.
    if ((selector & (1 << i)) == 0)
    {
      continue;
    }

    // Prepare state for this motor.
    char *currentState = (char *)malloc(128 * sizeof(char));

    // Read state.
    bool isWritable = MOTORS[i]->IsWritable();
    bool enabled = MOTORS[i]->EnableRequest();
    bool stepsComplete = MOTORS[i]->StepsComplete();
    bool isInHardwareFault = MOTORS[i]->IsInHwFault();
    uint32_t hlfbState = MOTORS[i]->HlfbState();
    uint32_t hlfbMode = MOTORS[i]->HlfbMode();
    uint32_t position = MOTORS[i]->PositionRefCommanded();

    // Format state and concat it into response.
    sprintf(currentState, "%d;%d;%d;%d;%d;%d;%d;", isWritable, enabled, stepsComplete, isInHardwareFault, hlfbState, hlfbMode, position);
    strcat(response, currentState);
    free(currentState);
  }
  return OK;
}

error getAnalogSensorsState(uint32_t args[], char *response)
{
  uint32_t selector = args[0];

  // Check that the selected port is avalaible.
  uint32_t portCount = getPortsCount(getExpansionBoardsCount());
  if (!selectorValid(selector, portCount))
  {
    return ERR_PORT_UNAVAILABLE;
  }

  if (!selectorMatchesAnalog(selector))
  {
    return ERR_PORT_UNAVAILABLE;
  }

  // Iterate over ports.
  for (uint32_t i = 0; i < portCount; ++i)
  {
    // Ignore ports not selected.
    if ((selector & (1 << i)) == 0)
    {
      continue;
    }

    // Prepare state for this motor.
    char *currentState = (char *)malloc(128 * sizeof(char));

    // Read state.
    int16_t adcResult = getPort(i)->State();

    // Convert the reading to a voltage.
    double inputVoltage = 10.0 * adcResult / ((1 << ADC_RESOLUTION) - 1);
    uint32_t millivolts = (uint32_t)round(1000.0 * inputVoltage);

    // Format state and concat it into response.
    sprintf(currentState, "%d;", millivolts);
    strcat(response, currentState);
    free(currentState);
  }
  return OK;
}

error getDigitalSensorsState(uint32_t args[], char *response)
{
  uint32_t selector = args[0];

  // Check that the selected port is available.
  uint32_t portCount = getPortsCount(getExpansionBoardsCount());
  if (!selectorValid(selector, portCount))
  {
    return ERR_PORT_UNAVAILABLE;
  }

  // Iterate over ports.
  for (uint32_t i = 0; i < portCount; ++i)
  {
    // Ignore motors not selected.
    if ((selector & (1 << i)) == 0)
    {
      continue;
    }

    // Prepare state for this motor.
    char *currentState = (char *)malloc(128 * sizeof(char));

    // Read voltage.
    int state = getPort(i)->State();

    // Format state and concat it into response.
    sprintf(currentState, "%d;", state);
    strcat(response, currentState);
    free(currentState);
  }
  return OK;
}

error setDigitalOutput(uint32_t args[], char *response)
{
  uint32_t selector = args[0];

  // Check that the selected port is available.
  uint32_t portCount = getPortsCount(getExpansionBoardsCount());
  if (!selectorValid(selector, portCount))
  {
    return ERR_PORT_UNAVAILABLE;
  }

  uint32_t selected = 0;

  // Iterate over ports.
  for (uint32_t i = 0; i < portCount; ++i)
  {
    // Ignore ports not selected.
    if ((selector & (1 << i)) == 0)
    {
      continue;
    }

    // Read arguments;
    bool enableCurrent = args[selected + 1] != 0;

    ++selected;

    // Enable/disable pins.
    getPort(i)->State(enableCurrent);
  }
  return OK;
}

error enableMotors(uint32_t args[], char *response)
{
  uint32_t selector = args[0];

  // Iterate over motors.
  for (uint32_t i = 0; i < MOTOR_COUNT; ++i)
  {

    // Determine whether to enable or disable the current motor.
    bool enableCurrent = (selector & (1 << i)) != 0;

    if (enableCurrent)
    {
      // Clear all motion preventing alerts.
      MOTORS[i]->ClearAlerts();
    }

    // Enable/disable motor.
    MOTORS[i]->EnableRequest(enableCurrent);
  }
  return OK;
}

error homeMotors(uint32_t args[], char *response)
{
  uint32_t selector = args[0];

  // Iterate over motors.
  for (uint32_t i = 0; i < MOTOR_COUNT; ++i)
  {
    // Ignore motors not selected.
    if ((selector & (1 << i)) == 0)
    {
      continue;
    }

    // Set current position as home.
    MOTORS[i]->PositionRefSet(0);
  }
  return OK;
}

error moveMotors(uint32_t args[], char *response)
{
  uint32_t selector = args[0];
  uint32_t selected = 0;

  // Iterate over motors and arguments.
  for (uint32_t i = 0; i < MOTOR_COUNT; ++i)
  {
    // Ignore motors not selected.
    if ((selector & (1 << i)) == 0)
    {
      continue;
    }

    // Read arguments;
    uint32_t steps = args[3 * selected + 1];
    uint32_t velocity = args[3 * selected + 2];
    uint32_t acceleration = args[3 * selected + 3];

    ++selected;

    // Skip the motors not to be moved.
    if (steps == 0)
      continue;

    // Set the velocity and acceleration.
    MOTORS[i]->VelMax(velocity);
    MOTORS[i]->AccelMax(acceleration);

    // Initialize the movement.
    MOTORS[i]->Move(steps);
  }
  return OK;
}

error setMotorsVelocity(uint32_t args[], char *response)
{
  uint32_t selector = args[0];
  uint32_t selected = 0;

  // Iterate over motors and arguments.
  for (uint32_t i = 0; i < MOTOR_COUNT; ++i)
  {
    // Ignore motors not selected.
    if ((selector & (1 << i)) == 0)
    {
      continue;
    }

    // Read arguments;
    uint32_t velocity = args[selected * 2 + 1];
    uint32_t acceleration = args[selected * 2 + 2];

    // Set the acceleration.
    MOTORS[i]->AccelMax(acceleration);

    // Initialize the movement.
    MOTORS[i]->MoveVelocity(velocity);

    ++selected;
  }
  return OK;
}

error motorsStopAbrupt(uint32_t args[], char *response)
{
  uint32_t selector = args[0];

  // Iterate over motors and arguments.
  for (uint32_t i = 0; i < MOTOR_COUNT; ++i)
  {
    // Ignore motors not selected.
    if ((selector & (1 << i)) == 0)
    {
      continue;
    }

    // Set the acceleration.
    MOTORS[i]->MoveStopAbrupt();
  }
  return OK;
}

error motorsSetEstopPin(uint32_t args[], char *response)
{
  uint32_t pinIndex = args[0];
  ClearCorePins estopPinOptions[] = {IO0, IO1, IO2, IO3, IO4, IO5, DI6, DI7, DI8};

  if (pinIndex >= 9)
  {
    return ERR_PORT_UNAVAILABLE;
  }

  // Iterate over motors.
  for (uint32_t i = 0; i < MOTOR_COUNT; ++i)
  {
    // Set estop pin.
    MOTORS[i]->EStopConnector(estopPinOptions[pinIndex]);
  }
  return OK;
}

Connector::ConnectorModes portModeToConnectorMode(port_mode mode)
{
  switch (mode)
  {
  case PORT_MODE_DIGITAL_INPUT:
    return Connector::INPUT_DIGITAL;
  case PORT_MODE_DIGITAL_OUTPUT:
    return Connector::OUTPUT_DIGITAL;
  case PORT_MODE_ANALOG_INPUT:
    return Connector::INPUT_ANALOG;
  case PORT_MODE_ANALOG_OUTPUT:
    return Connector::OUTPUT_ANALOG;
  default:
    return Connector::INPUT_DIGITAL;
  }
}

error setPortsMode(uint32_t args[], char *response)
{
  uint32_t selector = args[0];
  uint32_t modeInt = args[1];

  if (modeInt >= PORT_MODE_LAST)
  {
    return ERR_PORT_MODE_INVALID;
  }

  port_mode mode = static_cast<port_mode>(modeInt);

  // Check that the selected port is available.
  uint32_t portCount = getPortsCount(getExpansionBoardsCount());
  if (!selectorValid(selector, portCount))
  {
    return ERR_PORT_UNAVAILABLE;
  }

  // In case of analog mode, check that the right port is selected.
  if ((mode == PORT_MODE_ANALOG_INPUT || mode == PORT_MODE_ANALOG_OUTPUT) && !selectorMatchesAnalog(selector))
  {
    return ERR_PORT_UNAVAILABLE;
  }

  // Convert to connector mode.
  Connector::ConnectorModes connectorMode = portModeToConnectorMode(mode);

  // Iterate over ports.
  for (uint32_t i = 0; i < portCount; ++i)
  {
    // Ignore ports not selected.
    if ((selector & (1 << i)) == 0)
    {
      continue;
    }

    getPort(i)->Mode(connectorMode);
  }
  return OK;
}

uint32_t getExpansionBoardsCount()
{
  if (CcioMgr.LinkBroken())
  {
    return 0;
  }
  return CcioMgr.CcioCount();
}

uint32_t getPortsCount(uint32_t n)
{
  return CLEARCORE_PORT_COUNT + n * CCIO_PINS_PER_BOARD;
}

error expansionBoardsState(uint32_t args[], char *response)
{
  uint32_t nBoards = getExpansionBoardsCount();
  uint32_t nPorts = getPortsCount(nBoards);
  sprintf(response, "%d;%d;", nBoards, nPorts);
  return OK;
}

error getAbsoluteEncoderPosition(uint32_t args[], char *response)
{
  // Open SPI port
  AbsEncoderPort.PortOpen();

  // Init buffer (two bytes)
  uint8_t buff[2] = {0x00, 0x00};

  // Send nothing and receive 2 bytes
  AbsEncoderPort.SpiTransferData(NULL, buff, 2);

  // Close the port
  AbsEncoderPort.PortClose();

  // If both bytes are 255, then the encoder is not connected (cannot happen otherwise)
  if (buff[0] == 255 && buff[1] == 255)
  {
    return ERR_ABS_ENCODER_NOT_CONNECTED;
  }

  // The actual data is 9 bits, so we need to shift one byte to the left and then add the last bit from the second byte
  uint32_t value = buff[0] << 1 | buff[1] >> 7;

  // Prepare state for this motor.
  char *state = (char *)malloc(128 * sizeof(char));

  // Format state and concat it into response.
  sprintf(state, "%d;", value);
  strcat(response, state);
  free(state);

  return OK;
}

// Identifies command, runs it and then responds to it.
void executeCommand()
{
  // Check for empty strings.
  if (cursor <= 1)
    return;

  // Temp pointer that shows where the strtoul conversion stops. We ignore this.
  char *endptr;

  // Read message id.
  char *messageIdString = strtok(buffer, DELIMITER);
  uint32_t messageId = strtoul(messageIdString, &endptr, 10);

  // Read command and arg count.
  char *command = strtok(NULL, DELIMITER);
  char *argcString = strtok(NULL, DELIMITER);
  uint32_t argc = strtoul(argcString, &endptr, 10);

  // Read each argument as integer.
  uint32_t args[argc];
  for (uint32_t i = 0; i < argc; ++i)
  {
    char *argStr = strtok(NULL, DELIMITER);
    args[i] = strtoul(argStr, &endptr, 10);
  }

  // Prepare response.
  char *response = (char *)malloc(BUFFER_SIZE * sizeof(char));
  sprintf(response, "%s", ""); // Start the string (adds string terminator).

  error err = OK;

  // Check all commands.
  if (strcmp(command, "GET_VERSION") == 0)
  {
    err = getVersion(args, response);
  }
  else if (strcmp(command, "MOTORS_STATE") == 0)
  {
    err = getMotorsState(args, response);
  }
  else if (strcmp(command, "MOTORS_ENABLE") == 0)
  {
    err = enableMotors(args, response);
  }
  else if (strcmp(command, "MOTORS_MOVE") == 0)
  {
    err = moveMotors(args, response);
  }
  else if (strcmp(command, "MOTORS_HOME") == 0)
  {
    err = homeMotors(args, response);
  }
  else if (strcmp(command, "DSENSORS_STATE") == 0)
  {
    err = getDigitalSensorsState(args, response);
  }
  else if (strcmp(command, "ASENSORS_STATE") == 0)
  {
    err = getAnalogSensorsState(args, response);
  }
  else if (strcmp(command, "DPINS_SET") == 0)
  {
    err = setDigitalOutput(args, response);
  }
  else if (strcmp(command, "MOTORS_SET_VELOCITY") == 0)
  {
    err = setMotorsVelocity(args, response);
  }
  else if (strcmp(command, "MOTORS_STOP_ABRUPT") == 0)
  {
    err = motorsStopAbrupt(args, response);
  }
  else if (strcmp(command, "MOTORS_SET_ESTOP_PIN") == 0)
  {
    err = motorsSetEstopPin(args, response);
  }
  else if (strcmp(command, "EXPANSION_BOARDS_STATE") == 0)
  {
    err = expansionBoardsState(args, response);
  }
  else if (strcmp(command, "PINS_MODE_SET") == 0)
  {
    err = setPortsMode(args, response);
  }
  else if (strcmp(command, "ABS_ENCODER_POSITION") == 0)
  {
    err = getAbsoluteEncoderPosition(args, response);
  }
  else
  {
    err = ERR_COMMAND_UNKNOWN;
    sprintf(response, "");
  }

  // Prepare error return value.
  char *errStr = (char *)malloc(16 * sizeof(char));
  sprintf(errStr, "%d", err);

  // Return response via serial.
  Serial.print(messageId);
  Serial.print(';');
  Serial.print(errStr);
  Serial.print(';');
  Serial.println(response);
  free(response);
  free(errStr);
}

void setupSerial()
{
  Serial.begin(BAUD_RATE);
  while (!Serial)
  {
    continue;
  }
}

void setupMotors()
{
  // Sets the input clocking rate. This normal rate is ideal for ClearPath step and direction applications.
  MotorMgr.MotorInputClocking(MotorManager::CLOCK_RATE_NORMAL);

  // Sets all motor connectors into step and direction mode.
  MotorMgr.MotorModeSet(MotorManager::MOTOR_ALL, Connector::CPM_MODE_STEP_AND_DIR);
}

void setupSensors()
{
  // Sets ADC resolution.
  analogReadResolution(ADC_RESOLUTION);
}

void setupExpansionBoard()
{
  // Set up the CCIO-8 COM port.
  CcioPort.Mode(Connector::CCIO);
  CcioPort.PortOpen();
}

void setupAbsEncoder()
{
  AbsEncoderPort.Mode(Connector::SPI);
  AbsEncoderPort.Speed(ABS_ENCODER_BAUD_RATE);
  AbsEncoderPort.SpiClock(ABS_ENCODER_CLOCK_POLARITY, ABS_ENCODER_CLOCK_PHASE);
  AbsEncoderPort.CharSize(ABS_ENCODER_CHAR_SIZE);
}

void setup()
{
  setupExpansionBoard();
  setupSensors();
  setupSerial();
  setupMotors();
  setupAbsEncoder();
}

// Main loop listening for commands and executing them.
void loop()
{
  serialCurrentByte = Serial.read();

  if (serialCurrentByte != -1)
  {
    // Convert to char and either add to buffer or execute command.
    char currentChar = (char)serialCurrentByte;

    if (currentChar == '\n')
    {
      // Terminate this string.
      buffer[cursor] = '\0';
      cursor++; // For the sake of consistency.

      // Execute command and move cursor to 0.
      executeCommand();
      cursor = 0;
      free(buffer);
      buffer = (char *)calloc(sizeof(char), BUFFER_SIZE);
    }
    else if (currentChar == '\r')
    {
      // Just reset the buffer.
      cursor = 0;
      free(buffer);
      buffer = (char *)calloc(sizeof(char), BUFFER_SIZE);
    }
    else
    {
      // Add char to buffer.
      buffer[cursor] = currentChar;
      cursor++;
    }
  }
}