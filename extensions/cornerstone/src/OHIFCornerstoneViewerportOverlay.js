import React, { Component } from 'react';
// import ViewportOverlay from 'react-cornerstone-viewport';
import OHIF from '@ohif/core';
import cornerstone from 'cornerstone-core';
import { parse, format } from 'date-fns';
const { StackManager } = OHIF.utils;

function formatNumberPrecision(number, precision) {
  if (number !== null) {
    return parseFloat(number).toFixed(precision);
  }
}

function formatDA(date, strFormat = 'MMM d, yyyy') {
  if (!date) {
    return;
  }

  const dayOfWeek = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sab',
  };

  const months = {
    0: 'Jan',
    1: 'Fev',
    2: 'Mar',
    3: 'Abr',
    4: 'Mai',
    5: 'Jun',
    6: 'Jul',
    7: 'Ago',
    8: 'Set',
    9: 'Out',
    10: 'Nov',
    11: 'Dez',
  };

  // Goal: 'Apr 5, 1999'
  try {
    const parsedDateTime = parse(date, 'yyyyMMdd', new Date());
    //const formattedDateTime = format(parsedDateTime, strFormat);

    const formattedDateTime =
      dayOfWeek[parsedDateTime.getDay()] +
      ' ' +
      parsedDateTime.getDate() +
      ', ' +
      months[parsedDateTime.getMonth()] +
      ' de ' +
      parsedDateTime.getFullYear();

    return formattedDateTime;
  } catch (err) {
    // swallow?
  }

  return;
}

function formatPN(name) {
  if (!name) {
    return;
  }

  // Convert the first ^ to a ', '. String.replace() only affects
  // the first appearance of the character.
  const commaBetweenFirstAndLast = name.replace('^', ', ');

  // Replace any remaining '^' characters with spaces
  const cleaned = commaBetweenFirstAndLast.replace(/\^/g, ' ');

  // Trim any extraneous whitespace
  return cleaned.trim();
}

function formatTM(time, strFormat = 'HH:mm:ss') {
  if (!time) {
    return;
  }

  // DICOM Time is stored as HHmmss.SSS, where:
  //      HH 24 hour time:
  //      m mm    0..59   Minutes
  //      s ss    0..59   Seconds
  //      S SS SSS    0..999  Fractional seconds
  //
  // Goal: '24:12:12'
  try {
    const inputFormat = 'HHmmss.SSS';
    const strTime = time.toString().substring(0, inputFormat.length);

    const formattedDateTime =
      strTime.substr(0, 2) +
      ':' +
      strTime.substr(2, 2) +
      ':' +
      strTime.substr(4, 2);

    return formattedDateTime;
  } catch (err) {
    // swallow?
  }

  return;
}

function isValidNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

function getCompression(imageId) {
  const generalImageModule =
    cornerstone.metaData.get('generalImageModule', imageId) || {};
  const {
    lossyImageCompression,
    lossyImageCompressionRatio,
    lossyImageCompressionMethod,
  } = generalImageModule;

  if (lossyImageCompression === '01' && lossyImageCompressionRatio !== '') {
    const compressionMethod = lossyImageCompressionMethod || 'Perca: ';
    const compressionRatio = formatNumberPrecision(
      lossyImageCompressionRatio,
      2
    );
    return compressionMethod + compressionRatio + ' : 1';
  }

  return 'Sem perca / Não comprimido';
}

// Metadata configuration
const metadataProvider = new OHIF.cornerstone.MetadataProvider();

cornerstone.metaData.addProvider(
  metadataProvider.provider.bind(metadataProvider)
);

StackManager.setMetadataProvider(metadataProvider);

class CustomOverlay extends Component {
  render() {
    const { imageId, scale, windowWidth, windowCenter } = this.props;

    if (!imageId) {
      return null;
    }

    const zoomPercentage = formatNumberPrecision(scale * 100, 0);

    const seriesMetadata =
      cornerstone.metaData.get('generalSeriesModule', imageId) || {};

    const imagePlaneModule =
      cornerstone.metaData.get('imagePlaneModule', imageId) || {};

    const { rows, columns, sliceThickness, sliceLocation } = imagePlaneModule;
    const { seriesNumber, seriesDescription } = seriesMetadata;

    const generalStudyModule =
      cornerstone.metaData.get('generalStudyModule', imageId) || {};

    const { studyDate, studyTime, studyDescription } = generalStudyModule;

    const patientModule = cornerstone.metaData.get('patient', imageId) || {};

    const { name, id, sex, age } = patientModule;

    const generalImageModule =
      cornerstone.metaData.get('generalImageModule', imageId) || {};

    const { instanceNumber } = generalImageModule;

    const cineModule = cornerstone.metaData.get('cineModule', imageId) || {};
    const { frameTime } = cineModule;

    const frameRate = formatNumberPrecision(1000 / frameTime, 1);
    const compression = getCompression(imageId);
    const wwwc = `W: ${windowWidth.toFixed(0)} L: ${windowCenter.toFixed(0)}`;
    const imageDimensions = `${columns} x ${rows}`;

    const { imageIndex, stackSize } = this.props;

    const normal = (
      <React.Fragment>
        <div className="top-left overlay-element">
          <div>{formatPN(name)}</div>
          <div>
            {sex === 'F' ? 'Feminino' : 'Masculino'} - {age} Ano(s)
          </div>
          <div>{id}</div>
        </div>

        <div className="top-right overlay-element">
          <div>{studyDescription}</div>
          <div>{formatDA(studyDate)}</div>
          <div>{formatTM(studyTime)}</div>
        </div>

        <div className="bottom-right overlay-element">
          <div>Zoom: {zoomPercentage}%</div>
          <div>{wwwc}</div>
          <div className="compressionIndicator">{compression}</div>
        </div>

        <div className="bottom-left overlay-element">
          <div>{seriesNumber >= 0 ? `Ser: ${seriesNumber}` : ''}</div>
          <div>
            {stackSize > 1 ? `Img: ${instanceNumber} de ${stackSize}` : ''}
          </div>
          <div>
            {frameRate >= 0 ? `${formatNumberPrecision(frameRate, 2)} FPS` : ''}
            <div>{imageDimensions}</div>
            <div>
              {isValidNumber(sliceLocation)
                ? `Loc: ${formatNumberPrecision(sliceLocation, 2)} mm `
                : ''}
              {sliceThickness
                ? `Esp: ${formatNumberPrecision(sliceThickness, 2)} mm`
                : ''}
            </div>
            <div>{seriesDescription}</div>
          </div>
        </div>
      </React.Fragment>
    );

    return <div className="ViewportOverlay">{normal}</div>;
  }
}

export default CustomOverlay;
